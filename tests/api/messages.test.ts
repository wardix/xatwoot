import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import db from "../../src/db/client.ts";
import { authRoutes } from "../../src/routes/api/v1/auth.ts";
import { conversationRoutes } from "../../src/routes/api/v1/conversations.ts";
import { messageRoutes } from "../../src/routes/api/v1/messages.ts";
import { inboxRoutes } from "../../src/routes/api/v1/inboxes.ts";
import { contactRoutes } from "../../src/routes/api/v1/contacts.ts";

const app = new Hono();
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/conversations", conversationRoutes);
app.route("/api/v1/conversations/:conversation_id/messages", messageRoutes);
app.route("/api/v1/messages", messageRoutes);
app.route("/api/v1/inboxes", inboxRoutes);
app.route("/api/v1/contacts", contactRoutes);

async function json(res: Response): Promise<any> {
  return res.json();
}

const TEST_EMAIL = `test-msg-user-${Date.now()}@example.com`;
const TEST_PASSWORD = "msg-pass99";
let authToken: string;
let testAccountId: number;
let testInboxId: number;
let testContactId: number;
let testUserId: number;
let testConvId: number;

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
    CREATE TABLE IF NOT EXISTS messages (
      id BIGSERIAL PRIMARY KEY,
      conversation_id BIGINT REFERENCES conversations(id) ON DELETE CASCADE,
      sender_type VARCHAR(10) CHECK (sender_type IN ('user', 'contact')),
      sender_id BIGINT,
      body TEXT,
      message_type VARCHAR(10) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'audio')),
      status VARCHAR(10) DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read')),
      private BOOLEAN DEFAULT false,
      media_url TEXT,
      external_id VARCHAR(255) UNIQUE,
      account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)`);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)`);

  const rows = await db.unsafe(`
    INSERT INTO accounts (name, email) VALUES ('Msg Test Acct', 'msg-test-account@xatwoot.local')
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
  testUserId = regUser.id;

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
    body: JSON.stringify({ name: "Web Chat", channel_type: "web_widget" }),
  });
  testInboxId = (await json(inboxRes)).id;

  const contactRes = await app.request("/api/v1/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ name: "Customer Bob", email: `bob-${Date.now()}@example.com` }),
  });
  testContactId = (await json(contactRes)).id;

  const convRes = await app.request("/api/v1/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ inbox_id: testInboxId, contact_id: testContactId, subject: "Billing question" }),
  });
  testConvId = (await json(convRes)).id;
});

afterAll(async () => {
  await db.unsafe(`DELETE FROM messages WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM conversations WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM contacts WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM inboxes WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM users WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM accounts WHERE id = $1`, [testAccountId]);
  await db.end?.();
});

// ─── POST /api/v1/conversations/:conversation_id/messages & POST /api/v1/messages ───
describe("POST Message Creation", () => {
  it("sends a message in a conversation as user (agent)", async () => {
    const res = await app.request(`/api/v1/conversations/${testConvId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        body: "Hello, how can I help you?",
        message_type: "text",
        sender_type: "user",
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.id).toBeDefined();
    expect(body.conversation_id).toBe(testConvId);
    expect(body.body).toBe("Hello, how can I help you?");
    expect(body.sender_type).toBe("user");
    expect(body.sender_id).toBe(testUserId);
    expect(body.status).toBe("sent");
    expect(body.account_id).toBe(testAccountId);
  });

  it("sends a message as contact", async () => {
    const res = await app.request(`/api/v1/conversations/${testConvId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        body: "I need refund details",
        sender_type: "contact",
        sender_id: testContactId,
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.sender_type).toBe("contact");
    expect(body.sender_id).toBe(testContactId);
  });

  it("supports private internal notes", async () => {
    const res = await app.request(`/api/v1/conversations/${testConvId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        body: "Internal note: customer requested manager",
        private: true,
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.private).toBe(true);
  });

  it("can send message via POST /api/v1/messages with conversation_id in body", async () => {
    const res = await app.request("/api/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        conversation_id: testConvId,
        body: "Message via direct route",
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.conversation_id).toBe(testConvId);
    expect(body.body).toBe("Message via direct route");
  });

  it("returns 422 when body is missing", async () => {
    const res = await app.request(`/api/v1/conversations/${testConvId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ sender_type: "user" }),
    });
    expect(res.status).toBe(422);
    const body = await json(res);
    expect(body.error).toBe("Validation Failed");
  });

  it("returns 404 for non-existent conversation", async () => {
    const res = await app.request("/api/v1/conversations/999999999/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ body: "Hello ghost" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    const res = await app.request(`/api/v1/conversations/${testConvId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Unauthorized" }),
    });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/v1/conversations/:conversation_id/messages ──────────────────────
describe("GET Message Listing", () => {
  it("retrieves messages for conversation chronologically (ASC)", async () => {
    const res = await app.request(`/api/v1/conversations/${testConvId}/messages`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);

    // Verify chronological order
    for (let i = 1; i < body.length; i++) {
      const prev = new Date(body[i - 1].created_at).getTime();
      const curr = new Date(body[i].created_at).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it("returns 404 for non-existent conversation", async () => {
    const res = await app.request("/api/v1/conversations/999999999/messages", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(404);
  });

  it("returns 401 without auth token", async () => {
    const res = await app.request(`/api/v1/conversations/${testConvId}/messages`);
    expect(res.status).toBe(401);
  });
});
