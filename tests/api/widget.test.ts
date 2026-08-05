import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import db from "../../src/db/client.ts";
import { authRoutes } from "../../src/routes/api/v1/auth.ts";
import { contactRoutes } from "../../src/routes/api/v1/contacts.ts";
import { inboxRoutes } from "../../src/routes/api/v1/inboxes.ts";
import { conversationRoutes } from "../../src/routes/api/v1/conversations.ts";
import { widgetRoutes } from "../../src/routes/api/v1/widget.ts";

const app = new Hono();
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/contacts", contactRoutes);
app.route("/api/v1/contacts/:id/conversations", widgetRoutes);
app.route("/api/v1/inboxes", inboxRoutes);
app.route("/api/v1/conversations", conversationRoutes);

async function json(res: Response): Promise<any> {
  return res.json();
}

const TEST_EMAIL = `test-widget-user-${Date.now()}@example.com`;
const TEST_PASSWORD = "widget-pass99";
let authToken: string;
let testAccountId: number;
let testInboxId: number;
let testContactId: number;

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
    INSERT INTO accounts (name, email) VALUES ('Widget Test Acct', 'widget-test-account@xatwoot.local')
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
    body: JSON.stringify({ name: "Widget Inbox", channel_type: "web_widget" }),
  });
  testInboxId = (await json(inboxRes)).id;

  const contactRes = await app.request("/api/v1/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ name: "Visitor Test", email: `visitor-${Date.now()}@example.com` }),
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

describe("GET /api/v1/contacts/:id/conversations/active", () => {
  it("creates a new active conversation for visitor when none exists", async () => {
    const res = await app.request(`/api/v1/contacts/${testContactId}/conversations/active?inbox_id=${testInboxId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.id).toBeDefined();
    expect(body.contact_id).toBe(testContactId);
    expect(body.inbox_id).toBe(testInboxId);
    expect(body.status).toBe("open");
  });

  it("returns existing active conversation if open", async () => {
    const res = await app.request(`/api/v1/contacts/${testContactId}/conversations/active?inbox_id=${testInboxId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.contact_id).toBe(testContactId);
  });

  it("returns 404 for non-existent contact", async () => {
    const res = await app.request(`/api/v1/contacts/999999999/conversations/active?inbox_id=${testInboxId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(404);
  });

  it("returns 401 without auth token", async () => {
    const res = await app.request(`/api/v1/contacts/${testContactId}/conversations/active?inbox_id=${testInboxId}`);
    expect(res.status).toBe(401);
  });
});
