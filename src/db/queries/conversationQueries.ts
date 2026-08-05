import db from "../client.ts";

export interface Conversation {
  id: number;
  display_id: number;
  account_id: number;
  inbox_id: number;
  contact_id: number;
  assignee_id: number | null;
  status: "open" | "pending" | "resolved" | "snoozed";
  priority: "low" | "medium" | "high" | "urgent";
  waiting_since: Date | null;
  last_activity_at: Date | null;
  subject: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateConversationInput {
  account_id: number;
  inbox_id: number;
  contact_id: number;
  assignee_id?: number;
  status?: Conversation["status"];
  priority?: Conversation["priority"];
  subject?: string;
}

export interface UpdateConversationInput {
  status?: Conversation["status"];
  priority?: Conversation["priority"];
  assignee_id?: number | null;
  subject?: string;
}

export async function generateDisplayId(account_id: number): Promise<number> {
  const rows = await db.unsafe(
    `SELECT COALESCE(MAX(display_id), 0) + 1 AS next_display_id
     FROM conversations
     WHERE account_id = $1`,
    [account_id]
  );
  return Number((rows[0] as { next_display_id: number }).next_display_id);
}

export async function createConversation(input: CreateConversationInput): Promise<Conversation> {
  const {
    account_id,
    inbox_id,
    contact_id,
    assignee_id = null,
    status = "open",
    priority = "normal",
    subject = null,
  } = input;

  const display_id = await generateDisplayId(account_id);

  const rows = await db.unsafe(
    `INSERT INTO conversations
       (display_id, account_id, inbox_id, contact_id, assignee_id, status, priority, subject, last_activity_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     RETURNING *`,
    [display_id, account_id, inbox_id, contact_id, assignee_id, status, priority, subject]
  );
  return rows[0] as Conversation;
}

export async function listConversations(
  account_id: number,
  opts: {
    inbox_id?: number;
    status?: Conversation["status"];
    assignee_id?: number;
    limit?: number;
    offset?: number;
  }
): Promise<{ data: Conversation[]; total: number }> {
  const { inbox_id, status, assignee_id, limit = 20, offset = 0 } = opts;

  const whereClauses: string[] = ["account_id = $1"];
  const values: unknown[] = [account_id];
  let idx = 2;

  if (inbox_id !== undefined) {
    whereClauses.push(`inbox_id = $${idx++}`);
    values.push(inbox_id);
  }
  if (status !== undefined) {
    whereClauses.push(`status = $${idx++}`);
    values.push(status);
  }
  if (assignee_id !== undefined) {
    whereClauses.push(`assignee_id = $${idx++}`);
    values.push(assignee_id);
  }

  const whereSql = whereClauses.join(" AND ");

  const countValues = [...values];
  values.push(limit, offset);

  const [rows, countRows] = await Promise.all([
    db.unsafe(
      `SELECT * FROM conversations WHERE ${whereSql} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      values
    ),
    db.unsafe(`SELECT COUNT(*)::int AS total FROM conversations WHERE ${whereSql}`, countValues),
  ]);

  return {
    data: rows as Conversation[],
    total: (countRows[0] as { total: number }).total,
  };
}

export async function findConversationById(
  id: number,
  account_id: number
): Promise<Conversation | null> {
  const rows = await db.unsafe(
    `SELECT * FROM conversations WHERE id = $1 AND account_id = $2 LIMIT 1`,
    [id, account_id]
  );
  return (rows[0] as Conversation) ?? null;
}

export async function updateConversation(
  id: number,
  account_id: number,
  input: UpdateConversationInput
): Promise<Conversation | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (input.status !== undefined) {
    sets.push(`status = $${idx++}`);
    values.push(input.status);
  }
  if (input.priority !== undefined) {
    sets.push(`priority = $${idx++}`);
    values.push(input.priority);
  }
  if (input.assignee_id !== undefined) {
    sets.push(`assignee_id = $${idx++}`);
    values.push(input.assignee_id);
  }
  if (input.subject !== undefined) {
    sets.push(`subject = $${idx++}`);
    values.push(input.subject);
  }

  if (sets.length === 0) return findConversationById(id, account_id);

  sets.push(`updated_at = NOW()`, `last_activity_at = NOW()`);
  values.push(id, account_id);

  const rows = await db.unsafe(
    `UPDATE conversations SET ${sets.join(", ")} WHERE id = $${idx++} AND account_id = $${idx++} RETURNING *`,
    values
  );
  return (rows[0] as Conversation) ?? null;
}
