import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import db from "../../src/db/client.ts";
import { authRoutes } from "../../src/routes/api/v1/auth.ts";
import { contactRoutes } from "../../src/routes/api/v1/contacts.ts";

const app = new Hono();
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/contacts", contactRoutes);

async function json(res: Response): Promise<any> {
  return res.json();
}

const TEST_EMAIL = `test-contact-user-${Date.now()}@example.com`;
const TEST_PASSWORD = "contact-pass99";
let authToken: string;
let testAccountId: number;

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

  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_contacts_account ON contacts(account_id)`);
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_contacts_email_trgm ON contacts USING gin (email gin_trgm_ops) `);

  const rows = await db.unsafe(`
    INSERT INTO accounts (name, email) VALUES ('Contact Test Acct', 'contact-test-account@xatwoot.local')
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
});

afterAll(async () => {
  await db.unsafe(`DELETE FROM contacts WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM users WHERE email = $1`, [TEST_EMAIL]);
  await db.unsafe(`DELETE FROM accounts WHERE email = 'contact-test-account@xatwoot.local'`);
  await db.end?.();
});

// ─── POST /api/v1/contacts ───────────────────────────────────────────────────
describe("POST /api/v1/contacts", () => {
  it("creates a contact with name, email, phone", async () => {
    const res = await app.request("/api/v1/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        name: "Alice Smith",
        email: `alice-${Date.now()}@example.com`,
        phone_number: `+6281${Date.now().toString().slice(-8)}`,
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.id).toBeDefined();
    expect(body.name).toBe("Alice Smith");
    expect(body.account_id).toBe(testAccountId);
  });

  it("creates a contact with custom additional_attributes", async () => {
    const res = await app.request("/api/v1/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        name: "Bob Custom",
        email: `bob-custom-${Date.now()}@example.com`,
        additional_attributes: { company: "Acme Corp", plan: "enterprise" },
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.additional_attributes).toMatchObject({ company: "Acme Corp", plan: "enterprise" });
  });

  it("returns 422 for duplicate email in same account", async () => {
    const email = `dup-contact-${Date.now()}@example.com`;
    await app.request("/api/v1/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ name: "Dup 1", email }),
    });
    const res = await app.request("/api/v1/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ name: "Dup 2", email }),
    });
    expect(res.status).toBe(422);
    const body = await json(res);
    expect(body.error).toBe("Validation Failed");
  });

  it("returns 401 without auth token", async () => {
    const res = await app.request("/api/v1/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "No Auth" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 422 when email format is invalid", async () => {
    const res = await app.request("/api/v1/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ name: "Bad Email", email: "not-an-email" }),
    });
    expect(res.status).toBe(422);
  });
});

// ─── GET /api/v1/contacts ────────────────────────────────────────────────────
describe("GET /api/v1/contacts", () => {
  it("returns paginated list scoped to account", async () => {
    const res = await app.request("/api/v1/contacts", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta).toMatchObject({ page: 1, per_page: 20 });
    for (const c of body.data) {
      expect(c.account_id).toBe(testAccountId);
    }
  });

  it("searches contacts by name using ?q=", async () => {
    const unique = `SearchableXYZ-${Date.now()}`;
    await app.request("/api/v1/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ name: unique, email: `search-${Date.now()}@example.com` }),
    });

    const res = await app.request(`/api/v1/contacts?q=${unique}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.some((c: any) => c.name === unique)).toBe(true);
  });

  it("returns 401 without auth", async () => {
    const res = await app.request("/api/v1/contacts");
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/v1/contacts/:id ────────────────────────────────────────────────
describe("GET /api/v1/contacts/:id", () => {
  let contactId: number;

  beforeAll(async () => {
    const res = await app.request("/api/v1/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ name: "Detail Contact", email: `detail-${Date.now()}@example.com` }),
    });
    const body = await json(res);
    contactId = body.id;
  });

  it("returns contact detail by id", async () => {
    const res = await app.request(`/api/v1/contacts/${contactId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.id).toBe(contactId);
    expect(body.name).toBe("Detail Contact");
  });

  it("returns 404 for non-existent contact", async () => {
    const res = await app.request("/api/v1/contacts/999999999", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    const res = await app.request(`/api/v1/contacts/${contactId}`);
    expect(res.status).toBe(401);
  });
});

// ─── PUT /api/v1/contacts/:id ────────────────────────────────────────────────
describe("PUT /api/v1/contacts/:id", () => {
  let contactId: number;

  beforeAll(async () => {
    const res = await app.request("/api/v1/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ name: "Update Me", email: `update-me-${Date.now()}@example.com` }),
    });
    const body = await json(res);
    contactId = body.id;
  });

  it("updates contact name and additional_attributes", async () => {
    const res = await app.request(`/api/v1/contacts/${contactId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        name: "Updated Name",
        additional_attributes: { vip: true },
      }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.name).toBe("Updated Name");
    expect(body.additional_attributes).toMatchObject({ vip: true });
  });

  it("returns 404 for non-existent contact", async () => {
    const res = await app.request("/api/v1/contacts/999999999", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ name: "Ghost" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    const res = await app.request(`/api/v1/contacts/${contactId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "No auth" }),
    });
    expect(res.status).toBe(401);
  });
});
