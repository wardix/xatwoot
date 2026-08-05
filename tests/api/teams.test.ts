import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import db from "../../src/db/client.ts";
import { authRoutes } from "../../src/routes/api/v1/auth.ts";
import { teamRoutes } from "../../src/routes/api/v1/teams.ts";

const app = new Hono();
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/teams", teamRoutes);

async function json(res: Response): Promise<any> {
  return res.json();
}

const TEST_EMAIL = `test-team-user-${Date.now()}@example.com`;
const TEST_PASSWORD = "team-pass99";
let authToken: string;
let testAccountId: number;
let testUserId: number;

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
    CREATE TABLE IF NOT EXISTS teams (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      allow_auto_assign BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(account_id, name)
    )
  `);

  await db.unsafe(`
    CREATE TABLE IF NOT EXISTS team_memberships (
      id BIGSERIAL PRIMARY KEY,
      team_id BIGINT REFERENCES teams(id) ON DELETE CASCADE,
      user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
      account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
      role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(team_id, user_id)
    )
  `);

  const rows = await db.unsafe(`
    INSERT INTO accounts (name, email) VALUES ('Team Test Acct', 'team-test-account@xatwoot.local')
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `);
  testAccountId = (rows[0] as { id: number }).id;
}

beforeAll(async () => {
  await setupDb();

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
  const regUser = await json(regRes);
  testUserId = regUser.id;

  const loginRes = await app.request("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  const { token } = await json(loginRes);
  authToken = token;
});

afterAll(async () => {
  await db.unsafe(`DELETE FROM team_memberships WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM teams WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM users WHERE account_id = $1`, [testAccountId]);
  await db.unsafe(`DELETE FROM accounts WHERE id = $1`, [testAccountId]);
  await db.end?.();
});

describe("Teams Management API", () => {
  let createdTeamId: number;

  it("creates a new team with valid name & description", async () => {
    const res = await app.request("/api/v1/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        name: "Support Tier 1",
        description: "Frontline customer support team",
        allow_auto_assign: true,
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.id).toBeDefined();
    expect(body.name).toBe("Support Tier 1");
    expect(body.account_id).toBe(testAccountId);
    createdTeamId = body.id;
  });

  it("lists teams scoped to account", async () => {
    const res = await app.request("/api/v1/teams", {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.some((t: any) => t.id === createdTeamId)).toBe(true);
  });

  it("returns 422 for duplicate team name in account", async () => {
    const res = await app.request("/api/v1/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ name: "Support Tier 1" }),
    });
    expect(res.status).toBe(422);
  });

  it("adds user to team membership", async () => {
    const res = await app.request(`/api/v1/teams/${createdTeamId}/memberships`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        user_id: testUserId,
        role: "admin",
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.id).toBeDefined();
    expect(body.team_id).toBe(createdTeamId);
    expect(body.user_id).toBe(testUserId);
  });

  it("lists team members for a team", async () => {
    const res = await app.request(`/api/v1/teams/${createdTeamId}/memberships`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((m: any) => m.user_id === testUserId)).toBe(true);
  });

  it("returns 404 when adding member to non-existent team", async () => {
    const res = await app.request("/api/v1/teams/999999999/memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ user_id: testUserId }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 401 without auth token", async () => {
    const res = await app.request("/api/v1/teams");
    expect(res.status).toBe(401);
  });
});
