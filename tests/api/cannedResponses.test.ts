import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import db from "../../src/db/client.ts";
import { authRoutes } from "../../src/routes/api/v1/auth.ts";
import { cannedResponseRoutes } from "../../src/routes/api/v1/cannedResponses.ts";

const app = new Hono();
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/canned-responses", cannedResponseRoutes);

async function json(res: Response): Promise<any> {
  return res.json();
}

const TEST_EMAIL = `canned-user-${Date.now()}@example.com`;
const TEST_PASSWORD = "canned-pass99";
let authToken: string;
let testAccountId: number;
let testUserId: number;

async function setupDb() {
  const rows = await db.unsafe(`
    INSERT INTO accounts (name, email) VALUES ('Canned Test Acct', 'canned-test-account-${Date.now()}@xatwoot.local')
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
  testUserId = Number(regUser.id);

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
  await db.unsafe(`DELETE FROM canned_responses WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM users WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM accounts WHERE id = $1`, [testAccountId]);
  await db.end?.();
});

describe("Canned Responses API (/api/v1/canned-responses)", () => {
  let createdId: number;

  it("creates a new canned response", async () => {
    const res = await app.request("/api/v1/canned-responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        shortcut: "greeting",
        content: "Hello! How can I help you today?",
      }),
    });
    expect(res.status).toBe(201);
    const data = await json(res);
    expect(data.id).toBeDefined();
    expect(data.shortcut).toBe("greeting");
    expect(data.content).toBe("Hello! How can I help you today?");
    createdId = Number(data.id);
  });

  it("lists canned responses for the account", async () => {
    const res = await app.request("/api/v1/canned-responses", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.some((item: any) => Number(item.id) === createdId)).toBe(true);
  });

  it("prevents duplicate shortcuts within the same account", async () => {
    const res = await app.request("/api/v1/canned-responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        shortcut: "greeting",
        content: "Duplicate greeting test",
      }),
    });
    expect(res.status).toBe(422);
  });

  it("deletes a canned response", async () => {
    const res = await app.request(`/api/v1/canned-responses/${createdId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
  });

  it("returns 401 without auth token", async () => {
    const res = await app.request("/api/v1/canned-responses");
    expect(res.status).toBe(401);
  });
});
