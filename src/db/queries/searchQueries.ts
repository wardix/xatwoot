import db from "../client.ts";
import type { Conversation } from "./conversationQueries.ts";

export async function searchConversations(
  account_id: number,
  query: string,
  limit = 20,
  offset = 0
): Promise<{ data: Conversation[]; total: number }> {
  const pattern = `%${query.trim()}%`;

  const [rows, countRows] = await Promise.all([
    db.unsafe(
      `SELECT DISTINCT c.* FROM conversations c
       LEFT JOIN messages m ON m.conversation_id = c.id
       WHERE c.account_id = $1
         AND (c.subject ILIKE $2 OR m.body ILIKE $2)
       ORDER BY c.created_at DESC
       LIMIT $3 OFFSET $4`,
      [account_id, pattern, limit, offset]
    ),
    db.unsafe(
      `SELECT COUNT(DISTINCT c.id)::int AS total FROM conversations c
       LEFT JOIN messages m ON m.conversation_id = c.id
       WHERE c.account_id = $1
         AND (c.subject ILIKE $2 OR m.body ILIKE $2)`,
      [account_id, pattern]
    ),
  ]);

  return {
    data: rows as Conversation[],
    total: (countRows[0] as { total: number }).total,
  };
}
