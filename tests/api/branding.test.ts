import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import db from "../../src/db/client.ts";
import { authRoutes } from "../../src/routes/api/v1/auth.ts";
import { accountRoutes } from "../../src/routes/api/v1/accounts.ts";

const app = new Hono();
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/accounts", accountRoutes);

async function json(res: Response): Promise<any> {
  return res.json();
}

const TEST_EMAIL = `branding-user-${Date.now()}@example.com`;
const TEST_PASSWORD = "branding-pass99";
let authToken: string;
let testAccountId: number;

async function setupDb() {
  const rows = await db.unsafe(`
    INSERT INTO accounts (name, email) VALUES ('Branding Test Acct', 'branding-test-account-${Date.now()}@xatwoot.local')
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
  await db.unsafe(`DELETE FROM users WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM accounts WHERE id = $1`, [testAccountId]);
  await db.end?.();
});

describe("PUT /api/v1/accounts/:id/branding", () => {
  it("updates account branding settings (logo_url, primary_color)", async () => {
    const res = await app.request(`/api/v1/accounts/${testAccountId}/branding`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        logo_url: "https://example.com/logo.png",
        primary_color: "#1f93ff",
        company_name: "Xatwoot Corp",
      }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.branding).toBeDefined();
    expect(body.branding.logo_url).toBe("https://example.com/logo.png");
    expect(body.branding.primary_color).toBe("#1f93ff");
    expect(body.branding.company_name).toBe("Xatwoot Corp");
  });

  it("returns 401 without auth token", async () => {
    const res = await app.request(`/api/v1/accounts/${testAccountId}/branding`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ primary_color: "#000000" }),
    });
    expect(res.status).toBe(401);
  });
});
