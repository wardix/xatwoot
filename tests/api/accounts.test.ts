import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { accountRoutes } from "../../src/routes/api/v1/accounts.ts";
import db from "../../src/db/client.ts";

const app = new Hono();
app.route("/api/v1/accounts", accountRoutes);

const TEST_EMAIL = `test-${Date.now()}@example.com`;

beforeAll(async () => {
  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS accounts (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone_number VARCHAR(50),
      domain VARCHAR(255),
      support_email VARCHAR(255),
      locale VARCHAR(10) DEFAULT 'en',
      settings JSONB DEFAULT '{}',
      limits JSONB DEFAULT '{"conversations": 1000}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
});

afterAll(async () => {
  await db.unsafe(`DELETE FROM accounts WHERE email LIKE 'test-%@example.com'`);
  await db.end?.();
});

// Helper to parse json as any
async function json(res: Response): Promise<any> {
  return res.json();
}

describe("POST /api/v1/accounts", () => {
  it("creates a new account with valid data", async () => {
    const res = await app.request("/api/v1/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Organization",
        email: TEST_EMAIL,
        locale: "en",
      }),
    });

    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body).toMatchObject({
      name: "Test Organization",
      email: TEST_EMAIL,
      locale: "en",
    });
    expect(body.id).toBeDefined();
    expect(body.created_at).toBeDefined();
  });

  it("returns 422 when email already exists", async () => {
    const res = await app.request("/api/v1/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Duplicate Org",
        email: TEST_EMAIL,
      }),
    });

    expect(res.status).toBe(422);
    const body = await json(res);
    expect(body.error).toBe("Validation Failed");
    expect(body.details.email).toBeDefined();
  });

  it("returns 422 when name is missing", async () => {
    const res = await app.request("/api/v1/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "valid@example.com" }),
    });

    expect(res.status).toBe(422);
    const body = await json(res);
    expect(body.error).toBe("Validation Failed");
    expect(body.details.name).toBeDefined();
  });

  it("returns 422 when email format is invalid", async () => {
    const res = await app.request("/api/v1/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Org", email: "not-an-email" }),
    });

    expect(res.status).toBe(422);
    const body = await json(res);
    expect(body.error).toBe("Validation Failed");
    expect(body.details.email).toBeDefined();
  });

  it("sets default locale to 'en' when not provided", async () => {
    const res = await app.request("/api/v1/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "No Locale Org",
        email: `test-nolang-${Date.now()}@example.com`,
      }),
    });

    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.locale).toBe("en");
  });

  it("persists optional fields: phone_number, domain, support_email", async () => {
    const res = await app.request("/api/v1/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Full Org",
        email: `test-full-${Date.now()}@example.com`,
        phone_number: "+628123456789",
        domain: "full-org.com",
        support_email: "support@full-org.com",
      }),
    });

    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.phone_number).toBe("+628123456789");
    expect(body.domain).toBe("full-org.com");
    expect(body.support_email).toBe("support@full-org.com");
  });
});

describe("GET /api/v1/accounts", () => {
  it("returns a paginated list of accounts", async () => {
    const res = await app.request("/api/v1/accounts");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta).toMatchObject({
      page: 1,
      per_page: 20,
    });
    expect(typeof body.meta.total).toBe("number");
  });
});

describe("GET /api/v1/accounts/:id", () => {
  it("returns an existing account by id", async () => {
    const createRes = await app.request("/api/v1/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Fetch By ID Org",
        email: `test-byid-${Date.now()}@example.com`,
      }),
    });
    const created = await json(createRes);

    const res = await app.request(`/api/v1/accounts/${created.id}`);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.id).toBe(created.id);
    expect(body.name).toBe("Fetch By ID Org");
  });

  it("returns 404 for a non-existent account", async () => {
    const res = await app.request("/api/v1/accounts/999999999");
    expect(res.status).toBe(404);
    const body = await json(res);
    expect(body.error).toBe("Not Found");
  });

  it("returns 404 for invalid id format", async () => {
    const res = await app.request("/api/v1/accounts/abc");
    expect(res.status).toBe(404);
  });
});
