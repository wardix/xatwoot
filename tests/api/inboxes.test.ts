import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import db from "../../src/db/client.ts";
import { authRoutes } from "../../src/routes/api/v1/auth.ts";
import { inboxRoutes } from "../../src/routes/api/v1/inboxes.ts";

const app = new Hono();
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/inboxes", inboxRoutes);

async function json(res: Response): Promise<any> {
  return res.json();
}

const TEST_EMAIL = `test-inbox-${Date.now()}@example.com`;
const TEST_PASSWORD = "inbox-pass99";
let authToken: string;
let testAccountId: number;

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
  await db.unsafe(`CREATE INDEX IF NOT EXISTS idx_inboxes_account ON inboxes(account_id)`);

  // Seed account
  const rows = await db.unsafe(`
    INSERT INTO accounts (name, email) VALUES ('Inbox Test Account', 'inbox-test-account@xatwoot.local')
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `);
  testAccountId = (rows[0] as { id: number }).id;
}

beforeAll(async () => {
  await setupDb();

  // Register & login to get auth token
  await app.request("/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD, account_id: testAccountId, role: "admin" }),
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
  await db.unsafe(`DELETE FROM inboxes WHERE name LIKE 'Test Inbox%' OR name LIKE 'Updated%'`);
  await db.unsafe(`DELETE FROM users WHERE email = $1`, [TEST_EMAIL]);
  await db.unsafe(`DELETE FROM accounts WHERE email = 'inbox-test-account@xatwoot.local'`);
  await db.end?.();
});

// ─── POST /api/v1/inboxes ────────────────────────────────────────────────────
describe("POST /api/v1/inboxes", () => {
  it("creates a new inbox with valid data (authenticated)", async () => {
    const res = await app.request("/api/v1/inboxes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: "Test Inbox Web",
        channel_type: "web_widget",
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.id).toBeDefined();
    expect(body.name).toBe("Test Inbox Web");
    expect(body.channel_type).toBe("web_widget");
    expect(body.enabled).toBe(true);
    expect(body.account_id).toBeDefined();
  });

  it("creates inbox with optional integration_config", async () => {
    const res = await app.request("/api/v1/inboxes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: "Test Inbox WhatsApp",
        channel_type: "whatsapp",
        integration_config: { phone_number_id: "123456789" },
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.integration_config).toMatchObject({ phone_number_id: "123456789" });
  });

  it("returns 401 without auth token", async () => {
    const res = await app.request("/api/v1/inboxes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "No Auth Inbox", channel_type: "email" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 422 when name is missing", async () => {
    const res = await app.request("/api/v1/inboxes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ channel_type: "email" }),
    });
    expect(res.status).toBe(422);
    const body = await json(res);
    expect(body.error).toBe("Validation Failed");
    expect(body.details.name).toBeDefined();
  });

  it("returns 422 when channel_type is invalid", async () => {
    const res = await app.request("/api/v1/inboxes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name: "Bad Channel", channel_type: "fax" }),
    });
    expect(res.status).toBe(422);
    const body = await json(res);
    expect(body.error).toBe("Validation Failed");
  });
});

// ─── GET /api/v1/inboxes ─────────────────────────────────────────────────────
describe("GET /api/v1/inboxes", () => {
  it("returns inboxes list scoped to user's account (authenticated)", async () => {
    const res = await app.request("/api/v1/inboxes", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta).toMatchObject({ page: 1, per_page: 20 });
    // All returned inboxes must belong to the same account
    for (const inbox of body.data) {
      expect(inbox.account_id).toBe(testAccountId);
    }
  });

  it("returns 401 without auth token", async () => {
    const res = await app.request("/api/v1/inboxes");
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/v1/inboxes/:id ─────────────────────────────────────────────────
describe("GET /api/v1/inboxes/:id", () => {
  let inboxId: number;

  beforeAll(async () => {
    const res = await app.request("/api/v1/inboxes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name: "Test Inbox Detail", channel_type: "email" }),
    });
    const body = await json(res);
    inboxId = body.id;
  });

  it("returns inbox detail by id", async () => {
    const res = await app.request(`/api/v1/inboxes/${inboxId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.id).toBe(inboxId);
    expect(body.name).toBe("Test Inbox Detail");
  });

  it("returns 404 for non-existent inbox", async () => {
    const res = await app.request("/api/v1/inboxes/999999999", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    const res = await app.request(`/api/v1/inboxes/${inboxId}`);
    expect(res.status).toBe(401);
  });
});

// ─── PUT /api/v1/inboxes/:id ─────────────────────────────────────────────────
describe("PUT /api/v1/inboxes/:id", () => {
  let inboxId: number;

  beforeAll(async () => {
    const res = await app.request("/api/v1/inboxes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name: "Test Inbox Update", channel_type: "telegram" }),
    });
    const body = await json(res);
    inboxId = body.id;
  });

  it("updates inbox name and enabled state", async () => {
    const res = await app.request(`/api/v1/inboxes/${inboxId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name: "Updated Inbox Name", enabled: false }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.name).toBe("Updated Inbox Name");
    expect(body.enabled).toBe(false);
  });

  it("returns 404 for non-existent inbox", async () => {
    const res = await app.request("/api/v1/inboxes/999999999", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name: "Ghost" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 401 without auth", async () => {
    const res = await app.request(`/api/v1/inboxes/${inboxId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "No auth" }),
    });
    expect(res.status).toBe(401);
  });
});
