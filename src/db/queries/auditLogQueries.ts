import db from "../client.ts";

export interface AuditLog {
  id: number;
  account_id: number | null;
  user_id: number | null;
  action: string;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface CreateAuditLogInput {
  account_id?: number | null;
  user_id?: number | null;
  action: string;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(
  input: CreateAuditLogInput
): Promise<AuditLog> {
  const rows = await db.unsafe(
    `INSERT INTO audit_logs (account_id, user_id, action, metadata)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING *`,
    [
      input.account_id ?? null,
      input.user_id ?? null,
      input.action,
      JSON.stringify(input.metadata ?? {}),
    ]
  );
  return rows[0] as AuditLog;
}

export async function listAuditLogs(
  account_id: number,
  limit = 50,
  offset = 0
): Promise<{ data: AuditLog[]; total: number }> {
  const [rows, countRows] = await Promise.all([
    db.unsafe(
      `SELECT * FROM audit_logs WHERE account_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [account_id, limit, offset]
    ),
    db.unsafe(
      `SELECT COUNT(*)::int AS total FROM audit_logs WHERE account_id = $1`,
      [account_id]
    ),
  ]);

  return {
    data: rows as AuditLog[],
    total: (countRows[0] as { total: number }).total,
  };
}
