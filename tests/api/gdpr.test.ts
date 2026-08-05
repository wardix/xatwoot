import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import db from "../../src/db/client.ts";
import { authRoutes } from "../../src/routes/api/v1/auth.ts";
import { gdprRoutes } from "../../src/routes/api/v1/gdpr.ts";
import { contactRoutes } from "../../src/routes/api/v1/contacts.ts";

const app = new Hono();
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/gdpr", gdprRoutes);
app.route("/api/v1/contacts", contactRoutes);

async function json(res: Response): Promise<any> {
  return res.json();
}

const TEST_EMAIL = `gdpr-user-${Date.now()}@example.com`;
const TEST_PASSWORD = "gdpr-pass99";
let authToken: string;
let testAccountId: number;
let testContactId: number;

async function setupDb() {
  const rows = await db.unsafe(`
    INSERT INTO accounts (name, email) VALUES ('GDPR Test Acct', 'gdpr-test-account-${Date.now()}@xatwoot.local')
    RETURNING id
  `);
  testAccountId = Number((rows[0] as { id: string | number }).id);

  const contactRows = await db.unsafe(`
    INSERT INTO contacts (account_id, name, email, phone_number)
    VALUES ($1, 'GDPR Target User', 'target@example.com', '+1234567890')
    RETURNING id
  `, [testAccountId]);
  testContactId = Number((contactRows[0] as { id: string | number }).id);
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
  await db.unsafe(`DELETE FROM contacts WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM users WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM accounts WHERE id = $1`, [testAccountId]);
  await db.end?.();
});

describe("GDPR Data Export & Deletion API", () => {
  it("exports all account data as JSON", async () => {
    const res = await app.request("/api/v1/gdpr/export", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.account).toBeDefined();
    expect(body.contacts).toBeDefined();
    expect(body.conversations).toBeDefined();
    expect(body.messages).toBeDefined();
    expect(Array.isArray(body.contacts)).toBe(true);
  });

  it("anonymizes PII on contact deletion", async () => {
    const deleteRes = await app.request(`/api/v1/contacts/${testContactId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(deleteRes.status).toBe(200);

    // Verify contact PII was anonymized
    const checkRows = await db.unsafe(`SELECT * FROM contacts WHERE id = $1`, [testContactId]);
    const contact = checkRows[0] as any;
    expect(contact.name).toBe("Deleted User");
    expect(contact.email).toBeNull();
    expect(contact.phone_number).toBeNull();
  });

  it("returns 401 without auth token", async () => {
    const res = await app.request("/api/v1/gdpr/export");
    expect(res.status).toBe(401);
  });
});
