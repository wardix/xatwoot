import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import db from "../../src/db/client.ts";
import { authRoutes } from "../../src/routes/api/v1/auth.ts";
import { conversationRoutes } from "../../src/routes/api/v1/conversations.ts";
import { labelRoutes } from "../../src/routes/api/v1/labels.ts";

const app = new Hono();
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/conversations", conversationRoutes);
app.route("/api/v1/conversations", labelRoutes);
app.route("/api/v1/labels", labelRoutes);

async function json(res: Response): Promise<any> {
  return res.json();
}

const TEST_EMAIL = `conv-filter-user-${Date.now()}@example.com`;
const TEST_PASSWORD = "conv-filter-pass99";
let authToken: string;
let testAccountId: number;
let testInboxId: number;
let testContactId: number;
let taggedConvId: number;
let untaggedConvId: number;
let labelName = "urgent-bug";

async function setupDb() {
  const accRows = await db.unsafe(`
    INSERT INTO accounts (name, email) VALUES ('Conv Filter Acct', 'filter-account-${Date.now()}@xatwoot.local')
    RETURNING id
  `);
  testAccountId = Number((accRows[0] as { id: string | number }).id);

  const inboxRows = await db.unsafe(`
    INSERT INTO inboxes (account_id, name, channel_type) VALUES ($1, 'Filter Inbox', 'web_widget') RETURNING id
  `, [testAccountId]);
  testInboxId = Number((inboxRows[0] as { id: string | number }).id);

  const contactRows = await db.unsafe(`
    INSERT INTO contacts (account_id, name, email) VALUES ($1, 'Filter Contact', 'contact@xatwoot.local') RETURNING id
  `, [testAccountId]);
  testContactId = Number((contactRows[0] as { id: string | number }).id);

  const conv1 = await db.unsafe(`
    INSERT INTO conversations (display_id, account_id, inbox_id, contact_id, status, priority, subject)
    VALUES (1, $1, $2, $3, 'open', 'high', 'Tagged Conversation')
    RETURNING id
  `, [testAccountId, testInboxId, testContactId]);
  taggedConvId = Number((conv1[0] as { id: string | number }).id);

  const conv2 = await db.unsafe(`
    INSERT INTO conversations (display_id, account_id, inbox_id, contact_id, status, priority, subject)
    VALUES (2, $1, $2, $3, 'open', 'low', 'Untagged Conversation')
    RETURNING id
  `, [testAccountId, testInboxId, testContactId]);
  untaggedConvId = Number((conv2[0] as { id: string | number }).id);

  const labelRows = await db.unsafe(`
    INSERT INTO labels (account_id, name, color) VALUES ($1, $2, '#ff0000') RETURNING id
  `, [testAccountId, labelName]);
  const labelId = Number((labelRows[0] as { id: string | number }).id);

  await db.unsafe(`
    INSERT INTO conversation_labels (conversation_id, label_id) VALUES ($1, $2)
  `, [taggedConvId, labelId]);
}

beforeAll(async () => {
  await setupDb();

  // Register user
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
  expect(regRes.status).toBe(201);

  // Login
  const loginRes = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  expect(loginRes.status).toBe(200);
  const { token } = await json(loginRes);
  authToken = token;
});

afterAll(async () => {
  await db.unsafe(`DELETE FROM conversation_labels WHERE conversation_id IN ($1, $2)`, [taggedConvId, untaggedConvId]);
  await db.unsafe(`DELETE FROM labels WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM conversations WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM contacts WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM inboxes WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM users WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM accounts WHERE id = $1`, [testAccountId]);
  await db.end?.();
});

describe("GET /api/v1/conversations?label=...", () => {
  it("filters conversations by label name", async () => {
    const res = await app.request(`/api/v1/conversations?label=${labelName}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);

    expect(body.data.length).toBe(1);
    expect(Number(body.data[0].id)).toBe(taggedConvId);
  });

  it("returns empty list if label filter matches no conversations", async () => {
    const res = await app.request(`/api/v1/conversations?label=nonexistent-label`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.length).toBe(0);
  });
});
