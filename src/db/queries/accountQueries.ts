import db from "../client.ts";

export interface Account {
  id: number;
  name: string;
  email: string;
  phone_number: string | null;
  domain: string | null;
  support_email: string | null;
  locale: string;
  settings: Record<string, unknown>;
  limits: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAccountInput {
  name: string;
  email: string;
  phone_number?: string;
  domain?: string;
  support_email?: string;
  locale?: string;
  settings?: Record<string, unknown>;
  limits?: Record<string, unknown>;
}

export async function createAccount(input: CreateAccountInput): Promise<Account> {
  const {
    name,
    email,
    phone_number = null,
    domain = null,
    support_email = null,
    locale = "en",
    settings = {},
    limits = { conversations: 1000 },
  } = input;

  const rows = await db.unsafe(
    `INSERT INTO accounts
       (name, email, phone_number, domain, support_email, locale, settings, limits)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
     RETURNING *`,
    [
      name,
      email,
      phone_number,
      domain,
      support_email,
      locale,
      JSON.stringify(settings),
      JSON.stringify(limits),
    ]
  );

  return rows[0] as Account;
}

export async function findAccountByEmail(email: string): Promise<Account | null> {
  const rows = await db.unsafe(
    `SELECT * FROM accounts WHERE email = $1 LIMIT 1`,
    [email]
  );
  return (rows[0] as Account) ?? null;
}

export async function findAccountById(id: number): Promise<Account | null> {
  const rows = await db.unsafe(
    `SELECT * FROM accounts WHERE id = $1 LIMIT 1`,
    [id]
  );
  return (rows[0] as Account) ?? null;
}

export async function listAccounts(
  limit = 20,
  offset = 0
): Promise<{ data: Account[]; total: number }> {
  const [rows, countRows] = await Promise.all([
    db.unsafe(`SELECT * FROM accounts ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [
      limit,
      offset,
    ]),
    db.unsafe(`SELECT COUNT(*)::int AS total FROM accounts`),
  ]);
  return {
    data: rows as Account[],
    total: (countRows[0] as { total: number }).total,
  };
}
