import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import db from "../../src/db/client.ts";
import { authRoutes } from "../../src/routes/api/v1/auth.ts";
import { teamRoutes } from "../../src/routes/api/v1/teams.ts";
import { auditLogRoutes } from "../../src/routes/api/v1/auditLogs.ts";
import { auditLoggerMiddleware } from "../../src/middleware/auditLogger.ts";

const app = new Hono();
app.use("*", auditLoggerMiddleware);
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/teams", teamRoutes);
app.route("/api/v1/audit-logs", auditLogRoutes);

async function json(res: Response): Promise<any> {
  return res.json();
}

const TEST_EMAIL = `audit-user-${Date.now()}@example.com`;
const TEST_PASSWORD = "audit-pass99";
let authToken: string;
let testAccountId: number;
let testUserId: number;

async function setupDb() {
  const rows = await db.unsafe(`
    INSERT INTO accounts (name, email) VALUES ('Audit Test Acct', 'audit-test-account-${Date.now()}@xatwoot.local')
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
  await db.unsafe(`DELETE FROM audit_logs WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM teams WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM users WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM accounts WHERE id = $1`, [testAccountId]);
  await db.end?.();
});

describe("Audit Logging System (/api/v1/audit-logs)", () => {
  it("automatically creates an audit log entry on mutation request", async () => {
    // Perform a mutation (POST team)
    const createRes = await app.request("/api/v1/teams", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: "Audit Test Team",
        description: "Team to test audit logging",
      }),
    });
    expect(createRes.status).toBe(201);

    // Fetch audit logs
    const logsRes = await app.request("/api/v1/audit-logs", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(logsRes.status).toBe(200);
    const body = await json(logsRes);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    const logEntry = body.data.find(
      (entry: any) => entry.action === "POST /api/v1/teams"
    );
    expect(logEntry).toBeDefined();
    expect(Number(logEntry.user_id)).toBe(testUserId);
    expect(Number(logEntry.account_id)).toBe(testAccountId);
  });

  it("returns 401 without auth token when accessing audit logs", async () => {
    const res = await app.request("/api/v1/audit-logs");
    expect(res.status).toBe(401);
  });
});
