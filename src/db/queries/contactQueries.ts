import db from "../client.ts";

export interface Contact {
  id: number;
  account_id: number;
  name: string | null;
  email: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  additional_attributes: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateContactInput {
  account_id: number;
  name?: string;
  email?: string;
  phone_number?: string;
  avatar_url?: string;
  additional_attributes?: Record<string, unknown>;
}

export interface UpdateContactInput {
  name?: string;
  email?: string;
  phone_number?: string;
  avatar_url?: string;
  additional_attributes?: Record<string, unknown>;
}

export async function createContact(input: CreateContactInput): Promise<Contact> {
  const {
    account_id,
    name = null,
    email = null,
    phone_number = null,
    avatar_url = null,
    additional_attributes = {},
  } = input;

  const rows = await db.unsafe(
    `INSERT INTO contacts
       (account_id, name, email, phone_number, avatar_url, additional_attributes)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING *`,
    [account_id, name, email, phone_number, avatar_url, JSON.stringify(additional_attributes)]
  );
  return rows[0] as Contact;
}

export async function listContacts(
  account_id: number,
  opts: { q?: string; limit?: number; offset?: number }
): Promise<{ data: Contact[]; total: number }> {
  const { q, limit = 20, offset = 0 } = opts;

  let rows: unknown[];
  let countRows: unknown[];

  if (q && q.trim()) {
    const pattern = `%${q.trim()}%`;
    [rows, countRows] = await Promise.all([
      db.unsafe(
        `SELECT * FROM contacts
         WHERE account_id = $1
           AND (name ILIKE $2 OR email ILIKE $2 OR phone_number ILIKE $2)
         ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
        [account_id, pattern, limit, offset]
      ),
      db.unsafe(
        `SELECT COUNT(*)::int AS total FROM contacts
         WHERE account_id = $1
           AND (name ILIKE $2 OR email ILIKE $2 OR phone_number ILIKE $2)`,
        [account_id, pattern]
      ),
    ]);
  } else {
    [rows, countRows] = await Promise.all([
      db.unsafe(
        `SELECT * FROM contacts WHERE account_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [account_id, limit, offset]
      ),
      db.unsafe(`SELECT COUNT(*)::int AS total FROM contacts WHERE account_id = $1`, [account_id]),
    ]);
  }

  return {
    data: rows as Contact[],
    total: (countRows[0] as { total: number }).total,
  };
}

export async function findContactById(id: number, account_id: number): Promise<Contact | null> {
  const rows = await db.unsafe(
    `SELECT * FROM contacts WHERE id = $1 AND account_id = $2 LIMIT 1`,
    [id, account_id]
  );
  return (rows[0] as Contact) ?? null;
}

export async function findContactByEmail(
  email: string,
  account_id: number
): Promise<Contact | null> {
  const rows = await db.unsafe(
    `SELECT * FROM contacts WHERE email = $1 AND account_id = $2 LIMIT 1`,
    [email, account_id]
  );
  return (rows[0] as Contact) ?? null;
}

export async function updateContact(
  id: number,
  account_id: number,
  input: UpdateContactInput
): Promise<Contact | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (input.name !== undefined) { sets.push(`name = $${idx++}`); values.push(input.name); }
  if (input.email !== undefined) { sets.push(`email = $${idx++}`); values.push(input.email); }
  if (input.phone_number !== undefined) { sets.push(`phone_number = $${idx++}`); values.push(input.phone_number); }
  if (input.avatar_url !== undefined) { sets.push(`avatar_url = $${idx++}`); values.push(input.avatar_url); }
  if (input.additional_attributes !== undefined) {
    sets.push(`additional_attributes = $${idx++}::jsonb`);
    values.push(JSON.stringify(input.additional_attributes));
  }

  if (sets.length === 0) return findContactById(id, account_id);

  sets.push(`updated_at = NOW()`);
  values.push(id, account_id);

  const rows = await db.unsafe(
    `UPDATE contacts SET ${sets.join(", ")} WHERE id = $${idx++} AND account_id = $${idx++} RETURNING *`,
    values
  );
  return (rows[0] as Contact) ?? null;
}
