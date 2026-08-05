import db from "../client.ts";

export interface CannedResponse {
  id: number;
  account_id: number;
  shortcut: string;
  content: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCannedResponseInput {
  account_id: number;
  shortcut: string;
  content: string;
}

export interface UpdateCannedResponseInput {
  shortcut?: string;
  content?: string;
}

export async function createCannedResponse(
  input: CreateCannedResponseInput
): Promise<CannedResponse> {
  const rows = await db.unsafe(
    `INSERT INTO canned_responses (account_id, shortcut, content)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [input.account_id, input.shortcut, input.content]
  );
  return rows[0] as CannedResponse;
}

export async function findCannedResponseByShortcut(
  shortcut: string,
  account_id: number
): Promise<CannedResponse | null> {
  const rows = await db.unsafe(
    `SELECT * FROM canned_responses WHERE shortcut = $1 AND account_id = $2 LIMIT 1`,
    [shortcut, account_id]
  );
  return (rows[0] as CannedResponse) ?? null;
}

export async function listCannedResponses(
  account_id: number,
  search?: string,
  limit = 50,
  offset = 0
): Promise<{ data: CannedResponse[]; total: number }> {
  let query = `SELECT * FROM canned_responses WHERE account_id = $1`;
  let countQuery = `SELECT COUNT(*)::int AS total FROM canned_responses WHERE account_id = $1`;
  const params: unknown[] = [account_id];

  if (search) {
    query += ` AND (shortcut ILIKE $2 OR content ILIKE $2)`;
    countQuery += ` AND (shortcut ILIKE $2 OR content ILIKE $2)`;
    params.push(`%${search}%`);
  }

  query += ` ORDER BY shortcut ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  const [rows, countRows] = await Promise.all([
    db.unsafe(query, [...params, limit, offset]),
    db.unsafe(countQuery, params),
  ]);

  return {
    data: rows as CannedResponse[],
    total: (countRows[0] as { total: number }).total,
  };
}

export async function deleteCannedResponse(
  id: number,
  account_id: number
): Promise<boolean> {
  const rows = await db.unsafe(
    `DELETE FROM canned_responses WHERE id = $1 AND account_id = $2 RETURNING id`,
    [id, account_id]
  );
  return rows.length > 0;
}
