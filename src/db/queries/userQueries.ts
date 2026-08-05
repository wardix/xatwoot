import db from "../client.ts";

export interface User {
  id: number;
  account_id: number;
  email: string;
  password_hash: string;
  name?: string;
  role: "admin" | "agent" | "viewer";
  availability: "online" | "away" | "offline";
  otp_secret?: string;
  provider?: string;
  uid?: string;
  pubsub_token?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserInput {
  account_id: number;
  email: string;
  password_hash: string;
  name?: string;
  role?: "admin" | "agent" | "viewer";
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const { account_id, email, password_hash, name = null, role = "agent" } = input;
  const rows = await db.unsafe(
    `INSERT INTO users (account_id, email, password_hash, name, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [account_id, email, password_hash, name, role]
  );
  return rows[0] as User;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const rows = await db.unsafe(
    `SELECT * FROM users WHERE email = $1 LIMIT 1`,
    [email]
  );
  return (rows[0] as User) ?? null;
}

export async function findUserById(id: number): Promise<User | null> {
  const rows = await db.unsafe(
    `SELECT * FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );
  return (rows[0] as User) ?? null;
}
