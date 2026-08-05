import db from "../client.ts";

export interface AnalyticsSummary {
  conversations: {
    total: number;
    open: number;
    resolved: number;
    pending: number;
    snoozed: number;
  };
  messages: {
    total: number;
  };
}

export async function getAnalyticsSummary(account_id: number): Promise<AnalyticsSummary> {
  const [convCounts, msgCount] = await Promise.all([
    db.unsafe(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(CASE WHEN status = 'open' THEN 1 END)::int AS open,
         COUNT(CASE WHEN status = 'resolved' THEN 1 END)::int AS resolved,
         COUNT(CASE WHEN status = 'pending' THEN 1 END)::int AS pending,
         COUNT(CASE WHEN status = 'snoozed' THEN 1 END)::int AS snoozed
       FROM conversations
       WHERE account_id = $1`,
      [account_id]
    ),
    db.unsafe(
      `SELECT COUNT(*)::int AS total FROM messages WHERE account_id = $1`,
      [account_id]
    ),
  ]);

  const conv = convCounts[0] as {
    total: number;
    open: number;
    resolved: number;
    pending: number;
    snoozed: number;
  };

  const msg = msgCount[0] as { total: number };

  return {
    conversations: {
      total: conv.total || 0,
      open: conv.open || 0,
      resolved: conv.resolved || 0,
      pending: conv.pending || 0,
      snoozed: conv.snoozed || 0,
    },
    messages: {
      total: msg.total || 0,
    },
  };
}
