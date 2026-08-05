import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import db from "../../src/db/client.ts";
import { authRoutes } from "../../src/routes/api/v1/auth.ts";
import { labelRoutes } from "../../src/routes/api/v1/labels.ts";
import { conversationRoutes } from "../../src/routes/api/v1/conversations.ts";
import { inboxRoutes } from "../../src/routes/api/v1/inboxes.ts";
import { contactRoutes } from "../../src/routes/api/v1/contacts.ts";

const app = new Hono();
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/labels", labelRoutes);
app.route("/api/v1/conversations", conversationRoutes);
app.route("/api/v1/conversations/:id/labels", labelRoutes);
app.route("/api/v1/inboxes", inboxRoutes);
app.route("/api/v1/contacts", contactRoutes);

async function json(res: Response): Promise<any> {
  return res.json();
}

const TEST_EMAIL = `test-label-user-${Date.now()}@example.com`;
const TEST_PASSWORD = "label-pass99";
let authToken: string;
let testAccountId: number;
let testInboxId: number;
let testContactId: number;
let testConvId: number;
let testLabelId: number;

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

  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS labels (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      color VARCHAR(7),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(account_id, name)
    )
  `);

  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS conversation_labels (
      conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
      label_id BIGINT REFERENCES labels(id) ON DELETE CASCADE,
      PRIMARY KEY (conversation_id, label_id),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  const rows = await db.unsafe(`
    INSERT INTO accounts (name, email) VALUES ('Label Test Acct', 'label-test-account@xatwoot.local')
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `);
  testAccountId = (rows[0] as { id: number }).id;
}

beforeAll(async () => {
  await setupDb();

  await app.request("/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      account_id: testAccountId,
      role: "admin",
    }),
  });

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
    body: JSON.stringify({ name: "Support Email", channel_type: "email" }),
  });
  testInboxId = (await json(inboxRes)).id;

  const contactRes = await app.request("/api/v1/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ name: "User LabelTest", email: `lbl-${Date.now()}@example.com` }),
  });
  testContactId = (await json(contactRes)).id;

  const convRes = await app.request("/api/v1/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ inbox_id: testInboxId, contact_id: testContactId, subject: "Tag me" }),
  });
  testConvId = (await json(convRes)).id;
});

afterAll(async () => {
  await db.unsafe(`DELETE FROM conversation_labels WHERE conversation_id = $1`, [testConvId]);
  await db.unsafe(`DELETE FROM labels WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM conversations WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM contacts WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM inboxes WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM users WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM accounts WHERE id = $1`, [testAccountId]);
  await db.end?.();
});

// ─── Label CRUD ────────────────────────────────────────────────────────────────
describe("Labels Management API", () => {
  it("creates a new label with name and color", async () => {
    const res = await app.request("/api/v1/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ name: "bug", color: "#ff0000" }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.id).toBeDefined();
    expect(body.name).toBe("bug");
    expect(body.color).toBe("#ff0000");
    testLabelId = body.id;
  });

  it("lists labels scoped to account", async () => {
    const res = await app.request("/api/v1/labels", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.some((l: any) => l.name === "bug")).toBe(true);
  });

  it("returns 422 for duplicate label name in account", async () => {
    const res = await app.request("/api/v1/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ name: "bug", color: "#0000ff" }),
    });
    expect(res.status).toBe(422);
  });
});

// ─── Conversation Tagging API ─────────────────────────────────────────────────
describe("Conversation Tagging API", () => {
  it("assigns labels to a conversation", async () => {
    const res = await app.request(`/api/v1/conversations/${testConvId}/labels`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ labels: ["bug"] }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((l: any) => l.name === "bug")).toBe(true);
  });

  it("gets labels for a conversation", async () => {
    const res = await app.request(`/api/v1/conversations/${testConvId}/labels`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((l: any) => l.name === "bug")).toBe(true);
  });

  it("removes a label from a conversation", async () => {
    const res = await app.request(`/api/v1/conversations/${testConvId}/labels/${testLabelId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.success).toBe(true);

    // Verify removed
    const listRes = await app.request(`/api/v1/conversations/${testConvId}/labels`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const list = await json(listRes);
    expect(list.some((l: any) => l.id === testLabelId)).toBe(false);
  });

  it("returns 404 for tagging non-existent conversation", async () => {
    const res = await app.request("/api/v1/conversations/999999999/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ labels: ["bug"] }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 401 without auth token", async () => {
    const res = await app.request(`/api/v1/conversations/${testConvId}/labels`);
    expect(res.status).toBe(401);
  });
});
