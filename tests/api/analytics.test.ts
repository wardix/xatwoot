import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import db from "../../src/db/client.ts";
import { authRoutes } from "../../src/routes/api/v1/auth.ts";
import { analyticsRoutes } from "../../src/routes/api/v1/analytics.ts";

const app = new Hono();
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/analytics", analyticsRoutes);

async function json(res: Response): Promise<any> {
  return res.json();
}

const TEST_EMAIL = `analytics-user-${Date.now()}@example.com`;
const TEST_PASSWORD = "analytics-pass99";
let authToken: string;
let testAccountId: number;

async function setupDb() {
  const rows = await db.unsafe(`
    INSERT INTO accounts (name, email) VALUES ('Analytics Test Acct', 'analytics-test-account-${Date.now()}@xatwoot.local')
    RETURNING id
  `);
  testAccountId = Number((rows[0] as { id: string | number }).id);

  // Seed sample conversation data for analytics
  const conv1 = await db.unsafe(`
    INSERT INTO conversations (display_id, account_id, status, priority, created_at)
    VALUES (1, $1, 'open', 'high', NOW() - INTERVAL '2 days')
    RETURNING id
  `, [testAccountId]);

  const conv2 = await db.unsafe(`
    INSERT INTO conversations (display_id, account_id, status, priority, created_at)
    VALUES (2, $1, 'resolved', 'low', NOW() - INTERVAL '1 day')
    RETURNING id
  `, [testAccountId]);

  const conv3 = await db.unsafe(`
    INSERT INTO conversations (display_id, account_id, status, priority, created_at)
    VALUES (3, $1, 'pending', 'low', NOW())
    RETURNING id
  `, [testAccountId]);
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
  await db.unsafe(`DELETE FROM conversations WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM users WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM accounts WHERE id = $1`, [testAccountId]);
  await db.end?.();
});

describe("Basic Analytics Dashboard API (/api/v1/analytics/summary)", () => {
  it("returns summary analytics for account conversations", async () => {
    const res = await app.request("/api/v1/analytics/summary", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    
    expect(body.conversations).toBeDefined();
    expect(body.conversations.total).toBe(3);
    expect(body.conversations.open).toBe(1);
    expect(body.conversations.resolved).toBe(1);
    expect(body.conversations.pending).toBe(1);
    expect(body.conversations.snoozed).toBe(0);
  });

  it("returns 401 without auth token", async () => {
    const res = await app.request("/api/v1/analytics/summary");
    expect(res.status).toBe(401);
  });
});
