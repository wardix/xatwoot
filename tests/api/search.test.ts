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
app.route("/api/v1/inboxes", inboxRoutes);
app.route("/api/v1/contacts", contactRoutes);

async function json(res: Response): Promise<any> {
  return res.json();
}

const TEST_EMAIL = `test-search-user-${Date.now()}@example.com`;
const TEST_PASSWORD = "search-pass99";
let authToken: string;
let testAccountId: number;
let testInboxId: number;
let testContactId: number;
let testConvId: number;

async function setupDb() {
  await db.unsafe(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  await db.unsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

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

  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_messages_body_trgm ON messages USING gin (body gin_trgm_ops)`);

  const rows = await db.unsafe(`
    INSERT INTO accounts (name, email) VALUES ('Search Test Acct', 'search-test-account@xatwoot.local')
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
    body: JSON.stringify({ name: "Search Inbox", channel_type: "web_widget" }),
  });
  testInboxId = (await json(inboxRes)).id;

  const contactRes = await app.request("/api/v1/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ name: "Search Contact", email: `searchc-${Date.now()}@example.com` }),
  });
  testContactId = (await json(contactRes)).id;

  const convRes = await app.request("/api/v1/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ inbox_id: testInboxId, contact_id: testContactId, subject: "SuperSecretSubject123" }),
  });
  testConvId = (await json(convRes)).id;

  // Add message for message body search test
  await app.request(`/api/v1/conversations/${testConvId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ body: "UniqueKeywordForTrigramSearch" }),
  });
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

describe("GET /api/v1/conversations/search", () => {
  it("searches conversations by subject", async () => {
    const res = await app.request("/api/v1/conversations/search?q=SuperSecretSubject123", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.some((c: any) => c.id === testConvId)).toBe(true);
  });

  it("searches conversations by message body via trigram index", async () => {
    const res = await app.request("/api/v1/conversations/search?q=UniqueKeywordForTrigramSearch", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.some((c: any) => c.id === testConvId)).toBe(true);
  });

  it("returns empty data list when query matches nothing", async () => {
    const res = await app.request("/api/v1/conversations/search?q=NonExistentQueryXYZ999", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.length).toBe(0);
  });

  it("returns 422 when q parameter is missing", async () => {
    const res = await app.request("/api/v1/conversations/search", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(422);
  });

  it("returns 401 without auth token", async () => {
    const res = await app.request("/api/v1/conversations/search?q=test");
    expect(res.status).toBe(401);
  });
});
