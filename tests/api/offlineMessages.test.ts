import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import db from "../../src/db/client.ts";
import { offlineMessageRoutes } from "../../src/routes/api/v1/offlineMessages.ts";

const app = new Hono();
app.route("/api/v1/offline-messages", offlineMessageRoutes);

async function json(res: Response): Promise<any> {
  return res.json();
}

let testAccountId: number;
let testInboxId: number;

beforeAll(async () => {
  // Create account
  const accRows = await db.unsafe(`
    INSERT INTO accounts (name, email)
    VALUES ('Offline Test Acct', 'offline-test-${Date.now()}@xatwoot.local')
    RETURNING id
  `);
  testAccountId = Number((accRows[0] as { id: string }).id);

  // Create inbox
  const inboxRows = await db.unsafe(`
    INSERT INTO inboxes (account_id, name, channel_type)
    VALUES ($1, 'Offline Inbox', 'web_widget')
    RETURNING id
  `, [testAccountId]);
  testInboxId = Number((inboxRows[0] as { id: string }).id);
});

afterAll(async () => {
  await db.unsafe(`DELETE FROM messages WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM conversations WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM contacts WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM inboxes WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM accounts WHERE id = $1`, [testAccountId]);
  await db.end?.();
});

describe("POST /api/v1/offline-messages", () => {
  it("stores offline message and creates pending conversation", async () => {
    const res = await app.request("/api/v1/offline-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inbox_id: testInboxId,
        name: "Jane Visitor",
        email: `jane-${Date.now()}@example.com`,
        message: "Hi, I need help but no one is available.",
      }),
    });
    expect(res.status).toBe(201);
    const data = await json(res);
    expect(data.status).toBe("pending");
    expect(data.message_id).toBeDefined();
    expect(data.conversation_id).toBeDefined();
    expect(data.confirmation).toBeDefined();
  });

  it("reuses existing contact if email already exists", async () => {
    const email = `repeated-${Date.now()}@example.com`;

    // First submission
    const res1 = await app.request("/api/v1/offline-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inbox_id: testInboxId,
        name: "Repeated User",
        email,
        message: "First message",
      }),
    });
    expect(res1.status).toBe(201);
    const data1 = await json(res1);

    // Second submission — same email
    const res2 = await app.request("/api/v1/offline-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inbox_id: testInboxId,
        name: "Repeated User",
        email,
        message: "Second message",
      }),
    });
    expect(res2.status).toBe(201);
    const data2 = await json(res2);

    // Conversation reused (pending)
    expect(data2.contact_id).toBe(data1.contact_id);
  });

  it("returns 422 when required fields are missing", async () => {
    const res = await app.request("/api/v1/offline-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "No Email" }),
    });
    expect(res.status).toBe(422);
  });

  it("returns 422 when inbox_id is missing", async () => {
    const res = await app.request("/api/v1/offline-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "No Inbox",
        email: "noinbox@example.com",
        message: "Hello",
      }),
    });
    expect(res.status).toBe(422);
  });

  it("returns 404 when inbox does not exist", async () => {
    const res = await app.request("/api/v1/offline-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inbox_id: 999999999,
        name: "Ghost User",
        email: "ghost@example.com",
        message: "Hello from the void",
      }),
    });
    expect(res.status).toBe(404);
  });
});
