import db from "../client.ts";

export interface Inbox {
  id: number;
  account_id: number;
  name: string;
  channel_type: "web_widget" | "email" | "whatsapp" | "facebook" | "telegram";
  integration_config: Record<string, unknown>;
  enabled: boolean;
  greeting_enabled: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateInboxInput {
  account_id: number;
  name: string;
  channel_type: Inbox["channel_type"];
  integration_config?: Record<string, unknown>;
  enabled?: boolean;
  greeting_enabled?: boolean;
}

export interface UpdateInboxInput {
  name?: string;
  integration_config?: Record<string, unknown>;
  enabled?: boolean;
  greeting_enabled?: boolean;
}

export async function createInbox(input: CreateInboxInput): Promise<Inbox> {
  const {
    account_id,
    name,
    channel_type,
    integration_config = {},
    enabled = true,
    greeting_enabled = false,
  } = input;

  const rows = await db.unsafe(
    `INSERT INTO inboxes
       (account_id, name, channel_type, integration_config, enabled, greeting_enabled)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)
     RETURNING *`,
    [account_id, name, channel_type, JSON.stringify(integration_config), enabled, greeting_enabled]
  );
  return rows[0] as Inbox;
}

export async function listInboxesByAccount(
  account_id: number,
  limit = 20,
  offset = 0
): Promise<{ data: Inbox[]; total: number }> {
  const [rows, countRows] = await Promise.all([
    db.unsafe(
      `SELECT * FROM inboxes WHERE account_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [account_id, limit, offset]
    ),
    db.unsafe(`SELECT COUNT(*)::int AS total FROM inboxes WHERE account_id = $1`, [account_id]),
  ]);
  return {
    data: rows as Inbox[],
    total: (countRows[0] as { total: number }).total,
  };
}

export async function findInboxById(id: number, account_id: number): Promise<Inbox | null> {
  const rows = await db.unsafe(
    `SELECT * FROM inboxes WHERE id = $1 AND account_id = $2 LIMIT 1`,
    [id, account_id]
  );
  return (rows[0] as Inbox) ?? null;
}

/** Public variant — finds inbox by id alone (no account_id required). */
export async function findInboxByIdPublic(id: number): Promise<Inbox | null> {
  const rows = await db.unsafe(
    `SELECT * FROM inboxes WHERE id = $1 LIMIT 1`,
    [id]
  );
  return (rows[0] as Inbox) ?? null;
}


export async function updateInbox(
  id: number,
  account_id: number,
  input: UpdateInboxInput
): Promise<Inbox | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (input.name !== undefined) {
    sets.push(`name = $${idx++}`);
    values.push(input.name);
  }
  if (input.enabled !== undefined) {
    sets.push(`enabled = $${idx++}`);
    values.push(input.enabled);
  }
  if (input.greeting_enabled !== undefined) {
    sets.push(`greeting_enabled = $${idx++}`);
    values.push(input.greeting_enabled);
  }
  if (input.integration_config !== undefined) {
    sets.push(`integration_config = $${idx++}::jsonb`);
    values.push(JSON.stringify(input.integration_config));
  }

  if (sets.length === 0) {
    return findInboxById(id, account_id);
  }

  sets.push(`updated_at = NOW()`);
  values.push(id, account_id);

  const rows = await db.unsafe(
    `UPDATE inboxes SET ${sets.join(", ")} WHERE id = $${idx++} AND account_id = $${idx++} RETURNING *`,
    values
  );
  return (rows[0] as Inbox) ?? null;
}
