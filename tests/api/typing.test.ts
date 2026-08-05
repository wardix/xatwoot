import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import db from "../../src/db/client.ts";
import { authRoutes } from "../../src/routes/api/v1/auth.ts";
import { inboxRoutes } from "../../src/routes/api/v1/inboxes.ts";
import { contactRoutes } from "../../src/routes/api/v1/contacts.ts";
import { conversationRoutes } from "../../src/routes/api/v1/conversations.ts";
import { typingRoutes } from "../../src/routes/api/v1/typing.ts";

const app = new Hono();
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/inboxes", inboxRoutes);
app.route("/api/v1/contacts", contactRoutes);
app.route("/api/v1/conversations", conversationRoutes);
app.route("/api/v1/conversations/:id/typing", typingRoutes);

async function json(res: Response): Promise<any> {
  return res.json();
}

const TEST_EMAIL = `typing-user-${Date.now()}@example.com`;
const TEST_PASSWORD = "typing-pass99";
let authToken: string;
let testAccountId: number;
let testUserId: number;
let testConversationId: number;

async function setupDb() {
  const rows = await db.unsafe(`
    INSERT INTO accounts (name, email) VALUES ('Typing Test Acct', 'typing-test-account-${Date.now()}@xatwoot.local')
    RETURNING id
  `);
  testAccountId = Number((rows[0] as { id: string | number }).id);
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
  const regUser = await json(regRes);
  testUserId = regUser.id;

  // Login
  const loginRes = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  expect(loginRes.status).toBe(200);
  const { token } = await json(loginRes);
  authToken = token;

  // Create inbox
  const inboxRes = await app.request("/api/v1/inboxes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ name: "Typing Inbox", channel_type: "web_widget" }),
  });
  expect(inboxRes.status).toBe(201);
  const inbox = await json(inboxRes);

  // Create contact
  const contactRes = await app.request("/api/v1/contacts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ name: "Typing Contact", email: `contact-typing-${Date.now()}@example.com` }),
  });
  expect(contactRes.status).toBe(201);
  const contact = await json(contactRes);

  // Create conversation
  const convRes = await app.request("/api/v1/conversations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ inbox_id: Number(inbox.id), contact_id: Number(contact.id) }),
  });
  expect(convRes.status).toBe(201);
  const conv = await json(convRes);
  testConversationId = Number(conv.id);
});

afterAll(async () => {
  await db.unsafe(`DELETE FROM conversations WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM contacts WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM inboxes WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM users WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM accounts WHERE id = $1`, [testAccountId]);
  await db.end?.();
});

describe("POST /api/v1/conversations/:id/typing", () => {
  it("returns 200 when user sends typing_start action", async () => {
    const res = await app.request(`/api/v1/conversations/${testConversationId}/typing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ action: "start" }),
    });
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(data.event).toBe("typing_start");
    expect(data.conversation_id).toBe(testConversationId);
    expect(data.user_id).toBe(testUserId);
  });

  it("returns 200 when user sends typing_stop action", async () => {
    const res = await app.request(`/api/v1/conversations/${testConversationId}/typing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ action: "stop" }),
    });
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(data.event).toBe("typing_stop");
    expect(data.conversation_id).toBe(testConversationId);
  });

  it("returns 422 when action is invalid", async () => {
    const res = await app.request(`/api/v1/conversations/${testConversationId}/typing`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ action: "invalid_action" }),
    });
    expect(res.status).toBe(422);
  });

  it("returns 404 for non-existent conversation", async () => {
    const res = await app.request("/api/v1/conversations/999999999/typing", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ action: "start" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 401 without authentication", async () => {
    const res = await app.request(`/api/v1/conversations/${testConversationId}/typing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
    expect(res.status).toBe(401);
  });
});
