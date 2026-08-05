import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import db from "../../src/db/client.ts";

// Import routes yang belum ada — test akan FAIL dulu (RED phase)
import { authRoutes } from "../../src/routes/api/v1/auth.ts";
import { authMiddleware } from "../../src/middleware/auth.ts";

const app = new Hono();
app.route("/api/v1/auth", authRoutes);

// Protected test route
app.get("/protected", authMiddleware, (c) => c.json({ ok: true }));

const TEST_ACCOUNT_ID = 1; // assumes seed account exists
let createdUserId: number;
let validToken: string;

beforeAll(async () => {
  // Ensure tables exist
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

  // Seed a test account
  await db.unsafe(`
    INSERT INTO accounts (name, email) VALUES ('Test Account', 'test-auth-account@xatwoot.local')
    ON CONFLICT (email) DO NOTHING
  `);
});

afterAll(async () => {
  await db.unsafe(`DELETE FROM users WHERE email LIKE 'test-auth-%@example.com'`);
  await db.unsafe(`DELETE FROM accounts WHERE email = 'test-auth-account@xatwoot.local'`);
  await db.end?.();
});

async function json(res: Response): Promise<any> {
  return res.json();
}

// ─── POST /api/v1/auth/register ──────────────────────────────────────────────
describe("POST /api/v1/auth/register", () => {
  it("registers a new user with hashed password", async () => {
    const res = await app.request("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `test-auth-${Date.now()}@example.com`,
        password: "secret123",
        name: "Test User",
        account_id: 1,
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.id).toBeDefined();
    expect(body.email).toBeDefined();
    expect(body.password_hash).toBeUndefined(); // never expose hash
    expect(body.role).toBe("agent");
    createdUserId = body.id;
  });

  it("returns 422 when email is missing", async () => {
    const res = await app.request("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "secret123", account_id: 1 }),
    });
    expect(res.status).toBe(422);
    const body = await json(res);
    expect(body.error).toBe("Validation Failed");
  });

  it("returns 422 when password is too short", async () => {
    const res = await app.request("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "short@example.com",
        password: "123",
        account_id: 1,
      }),
    });
    expect(res.status).toBe(422);
  });

  it("returns 422 when email already registered", async () => {
    const email = `test-auth-dup-${Date.now()}@example.com`;
    // first register
    await app.request("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "secret123", account_id: 1 }),
    });
    // duplicate
    const res = await app.request("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "secret123", account_id: 1 }),
    });
    expect(res.status).toBe(422);
    const body = await json(res);
    expect(body.details?.email).toBeDefined();
  });
});

// ─── POST /api/v1/auth/login ─────────────────────────────────────────────────
describe("POST /api/v1/auth/login", () => {
  const email = `test-auth-login-${Date.now()}@example.com`;
  const password = "mypassword99";

  beforeAll(async () => {
    // Register a user to login with
    await app.request("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: "Login User", account_id: 1 }),
    });
  });

  it("returns JWT token on valid credentials", async () => {
    const res = await app.request("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.token).toBeDefined();
    expect(typeof body.token).toBe("string");
    expect(body.user).toMatchObject({ email, role: "agent" });
    expect(body.user.password_hash).toBeUndefined();
    validToken = body.token;
  });

  it("returns 401 on wrong password", async () => {
    const res = await app.request("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "wrongpassword" }),
    });
    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 on unknown email", async () => {
    const res = await app.request("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ghost@example.com", password: "secret" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 422 when body is missing fields", async () => {
    const res = await app.request("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    expect(res.status).toBe(422);
  });
});

// ─── GET /api/v1/auth/me ─────────────────────────────────────────────────────
describe("GET /api/v1/auth/me", () => {
  it("returns current user for valid token", async () => {
    // Login first to get a fresh token
    const email = `test-auth-me-${Date.now()}@example.com`;
    await app.request("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "mepassword", account_id: 1 }),
    });
    const loginRes = await app.request("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "mepassword" }),
    });
    const { token } = await json(loginRes);

    const res = await app.request("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.email).toBe(email);
    expect(body.password_hash).toBeUndefined();
  });

  it("returns 401 without token", async () => {
    const res = await app.request("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid token", async () => {
    const res = await app.request("/api/v1/auth/me", {
      headers: { Authorization: "Bearer invalid.token.here" },
    });
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/v1/auth/logout ────────────────────────────────────────────────
describe("POST /api/v1/auth/logout", () => {
  it("returns 200 with success message", async () => {
    const res = await app.request("/api/v1/auth/logout", { method: "POST" });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.message).toBeDefined();
  });
});

// ─── Auth Middleware ──────────────────────────────────────────────────────────
describe("authMiddleware", () => {
  it("allows access with valid Bearer token", async () => {
    const email = `test-auth-mid-${Date.now()}@example.com`;
    await app.request("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "middleware123", account_id: 1 }),
    });
    const loginRes = await app.request("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "middleware123" }),
    });
    const { token } = await json(loginRes);

    const res = await app.request("/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
  });

  it("blocks access without Authorization header", async () => {
    const res = await app.request("/protected");
    expect(res.status).toBe(401);
  });

  it("blocks access with expired/invalid token", async () => {
    const res = await app.request("/protected", {
      headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.bad.sig" },
    });
    expect(res.status).toBe(401);
  });
});
