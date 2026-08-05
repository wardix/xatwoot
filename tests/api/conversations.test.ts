import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import db from "../../src/db/client.ts";
import { authRoutes } from "../../src/routes/api/v1/auth.ts";
import { conversationRoutes } from "../../src/routes/api/v1/conversations.ts";
import { inboxRoutes } from "../../src/routes/api/v1/inboxes.ts";
import { contactRoutes } from "../../src/routes/api/v1/contacts.ts";

const app = new Hono();
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/conversations", conversationRoutes);
app.route("/api/v1/inboxes", inboxRoutes);
app.route("/api/v1/contacts", contactRoutes);

async function json(res: Response): Promise<any> {
  return res.json();
}

const TEST_EMAIL = `test-conv-user-${Date.now()}@example.com`;
const TEST_PASSWORD = "conv-pass99";
let authToken: string;
let testAccountId: number;
let testInboxId: number;
let testContactId: number;
let testAssigneeId: number;

async function setupDb() {
  await db.unsafe(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS accounts (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      locale VARCHAR(10) DEFAULT 'en',
      settings JSONB DEFAULT '{}',
      limits JSONB DEFAULT '{"conversations": 1000}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      role VARCHAR(20) DEFAULT 'agent' CHECK (role IN ('admin', 'agent', 'viewer')),
      availability VARCHAR(10) DEFAULT 'offline',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS inboxes (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      channel_type VARCHAR(50) CHECK (channel_type IN ('web_widget','email','whatsapp','facebook','telegram')),
      integration_config JSONB DEFAULT '{}',
      enabled BOOLEAN DEFAULT true,
      greeting_enabled BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS contacts (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
      name VARCHAR(255),
      email VARCHAR(255),
      phone_number VARCHAR(50),
      avatar_url TEXT,
      additional_attributes JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (account_id, email),
      UNIQUE (account_id, phone_number)
    )
  `);

  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS conversations (
      id BIGSERIAL PRIMARY KEY,
      display_id BIGINT NOT NULL,
      account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
      inbox_id BIGINT REFERENCES inboxes(id),
      contact_id BIGINT REFERENCES contacts(id),
      assignee_id BIGINT REFERENCES users(id),
      status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'snoozed')),
      priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
      waiting_since TIMESTAMP,
      last_activity_at TIMESTAMP,
      subject TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(account_id, display_id)
    )
  `);

  const rows = await db.unsafe(`
    INSERT INTO accounts (name, email) VALUES ('Conv Test Acct', 'conv-test-account@xatwoot.local')
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `);
  testAccountId = (rows[0] as { id: number }).id;
}

beforeAll(async () => {
  await setupDb();

  const regRes = await app.request("/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      account_id: testAccountId,
      role: "admin",
    }),
  });
  const regUser = await json(regRes);
  testAssigneeId = regUser.id;

  const loginRes = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  const { token } = await json(loginRes);
  authToken = token;

  const inboxRes = await app.request("/api/v1/inboxes", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ name: "Web Support", channel_type: "web_widget" }),
  });
  testInboxId = (await json(inboxRes)).id;

  const contactRes = await app.request("/api/v1/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ name: "Jane Customer", email: `jane-${Date.now()}@example.com` }),
  });
  testContactId = (await json(contactRes)).id;
});

afterAll(async () => {
  await db.unsafe(`DELETE FROM conversations WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM contacts WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM inboxes WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM users WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM accounts WHERE id = $1`, [testAccountId]);
  await db.end?.();
});

// ─── POST /api/v1/conversations ───────────────────────────────────────────────
describe("POST /api/v1/conversations", () => {
  it("creates a conversation with valid inbox_id & contact_id", async () => {
    const res = await app.request("/api/v1/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        inbox_id: testInboxId,
        contact_id: testContactId,
        subject: "Need help with login",
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.id).toBeDefined();
    expect(body.display_id).toBe(1);
    expect(body.status).toBe("open");
    expect(body.priority).toBe("normal");
    expect(body.inbox_id).toBe(testInboxId);
    expect(body.contact_id).toBe(testContactId);
  });

  it("increments display_id sequentially per account", async () => {
    const res = await app.request("/api/v1/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        inbox_id: testInboxId,
        contact_id: testContactId,
        subject: "Second ticket",
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.display_id).toBe(2);
  });

  it("creates conversation with assignee_id and custom priority", async () => {
    const res = await app.request("/api/v1/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        inbox_id: testInboxId,
        contact_id: testContactId,
        assignee_id: testAssigneeId,
        priority: "high",
        subject: "Urgent issue",
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.assignee_id).toBe(testAssigneeId);
    expect(body.priority).toBe("high");
  });

  it("returns 422 when inbox_id is missing", async () => {
    const res = await app.request("/api/v1/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ contact_id: testContactId }),
    });
    expect(res.status).toBe(422);
    const body = await json(res);
    expect(body.error).toBe("Validation Failed");
  });

  it("returns 401 without auth token", async () => {
    const res = await app.request("/api/v1/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inbox_id: testInboxId, contact_id: testContactId }),
    });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/v1/conversations ───────────────────────────────────────────────
describe("GET /api/v1/conversations", () => {
  it("lists conversations scoped to account", async () => {
    const res = await app.request("/api/v1/conversations", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta).toMatchObject({ page: 1, per_page: 20 });
    for (const conv of body.data) {
      expect(conv.account_id).toBe(testAccountId);
    }
  });

  it("filters conversations by status", async () => {
    const res = await app.request("/api/v1/conversations?status=open", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    for (const conv of body.data) {
      expect(conv.status).toBe("open");
    }
  });

  it("returns 401 without auth", async () => {
    const res = await app.request("/api/v1/conversations");
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/v1/conversations/:id ───────────────────────────────────────────
describe("GET /api/v1/conversations/:id", () => {
  let convId: number;

  beforeAll(async () => {
    const res = await app.request("/api/v1/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ inbox_id: testInboxId, contact_id: testContactId, subject: "Detail test" }),
    });
    convId = (await json(res)).id;
  });

  it("returns conversation detail with contact, inbox, assignee info", async () => {
    const res = await app.request(`/api/v1/conversations/${convId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.id).toBe(convId);
    expect(body.subject).toBe("Detail test");
  });

  it("returns 404 for non-existent conversation", async () => {
    const res = await app.request("/api/v1/conversations/999999999", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(404);
  });
});

// ─── PUT /api/v1/conversations/:id ───────────────────────────────────────────
describe("PUT /api/v1/conversations/:id", () => {
  let convId: number;

  beforeAll(async () => {
    const res = await app.request("/api/v1/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ inbox_id: testInboxId, contact_id: testContactId, subject: "Update test" }),
    });
    convId = (await json(res)).id;
  });

  it("updates conversation status and assignee_id", async () => {
    const res = await app.request(`/api/v1/conversations/${convId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ status: "resolved", assignee_id: testAssigneeId }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.status).toBe("resolved");
    expect(body.assignee_id).toBe(testAssigneeId);
  });

  it("returns 404 for non-existent conversation", async () => {
    const res = await app.request("/api/v1/conversations/999999999", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ status: "closed" }),
    });
    expect(res.status).toBe(404);
  });
});
