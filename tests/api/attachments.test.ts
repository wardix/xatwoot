import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import db from "../../src/db/client.ts";
import { authRoutes } from "../../src/routes/api/v1/auth.ts";
import { attachmentRoutes } from "../../src/routes/api/v1/attachments.ts";
import { messageRoutes } from "../../src/routes/api/v1/messages.ts";
import { conversationRoutes } from "../../src/routes/api/v1/conversations.ts";
import { inboxRoutes } from "../../src/routes/api/v1/inboxes.ts";
import { contactRoutes } from "../../src/routes/api/v1/contacts.ts";

const app = new Hono();
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/attachments", attachmentRoutes);
app.route("/api/v1/conversations", conversationRoutes);
app.route("/api/v1/conversations/:conversation_id/messages", messageRoutes);
app.route("/api/v1/inboxes", inboxRoutes);
app.route("/api/v1/contacts", contactRoutes);

async function json(res: Response): Promise<any> {
  return res.json();
}

const TEST_EMAIL = `test-attach-user-${Date.now()}@example.com`;
const TEST_PASSWORD = "attach-pass99";
let authToken: string;
let testAccountId: number;
let testInboxId: number;
let testContactId: number;
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

  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS attachments (
      id BIGSERIAL PRIMARY KEY,
      message_id BIGINT REFERENCES messages(id) ON DELETE CASCADE,
      account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      file_type VARCHAR(50) DEFAULT 'file',
      mime_type VARCHAR(100),
      file_size BIGINT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  const rows = await db.unsafe(`
    INSERT INTO accounts (name, email) VALUES ('Attachment Test Acct', 'attach-test-account@xatwoot.local')
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
    body: JSON.stringify({ name: "Attach Inbox", channel_type: "web_widget" }),
  });
  testInboxId = (await json(inboxRes)).id;

  const contactRes = await app.request("/api/v1/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ name: "Attach Contact", email: `attachc-${Date.now()}@example.com` }),
  });
  testContactId = (await json(contactRes)).id;

  const convRes = await app.request("/api/v1/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ inbox_id: testInboxId, contact_id: testContactId, subject: "Attachment Thread" }),
  });
  testConvId = (await json(convRes)).id;
});

afterAll(async () => {
  await db.unsafe(`DELETE FROM attachments WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM messages WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM conversations WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM contacts WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM inboxes WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM users WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM accounts WHERE id = $1`, [testAccountId]);
  await db.end?.();
});

describe("POST /api/v1/attachments", () => {
  it("uploads an attachment metadata returning URL and details", async () => {
    const res = await app.request("/api/v1/attachments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        url: "https://example.com/files/invoice.pdf",
        mime_type: "application/pdf",
        file_size: 2048576,
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.id).toBeDefined();
    expect(body.url).toBe("https://example.com/files/invoice.pdf");
    expect(body.mime_type).toBe("application/pdf");
    expect(body.account_id).toBe(testAccountId);
  });

  it("returns 422 when url is missing", async () => {
    const res = await app.request("/api/v1/attachments", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ mime_type: "image/png" }),
    });
    expect(res.status).toBe(422);
  });

  it("returns 401 without auth token", async () => {
    const res = await app.request("/api/v1/attachments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/test.png" }),
    });
    expect(res.status).toBe(401);
  });
});

describe("Message Creation with Attachments", () => {
  it("creates a message with attachment_url / media_url and associates attachments", async () => {
    const res = await app.request(`/api/v1/conversations/${testConvId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        body: "Here is the requested screenshot",
        message_type: "image",
        media_url: "https://example.com/files/screenshot.png",
        attachments: [
          {
            url: "https://example.com/files/screenshot.png",
            mime_type: "image/png",
          },
        ],
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.id).toBeDefined();
    expect(body.media_url).toBe("https://example.com/files/screenshot.png");
    expect(body.attachments).toBeDefined();
    expect(body.attachments.length).toBe(1);
    expect(body.attachments[0].url).toBe("https://example.com/files/screenshot.png");
  });
});
