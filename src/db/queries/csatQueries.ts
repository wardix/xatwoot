import db from "../client.ts";

export interface CSATSurvey {
  id: number;
  account_id: number;
  conversation_id: number;
  agent_id?: number;
  rating: number;
  comment?: string;
  created_at?: string;
}

/**
 * submitCSATSurvey — VS-ANALYTICS-002
 */
export async function submitCSATSurvey(params: {
  accountId: number;
  conversationId: number;
  rating: number;
  comment?: string;
}): Promise<CSATSurvey> {
  // Find conversation's assignee
  const conv = await db.unsafe(
    `SELECT assignee_id FROM conversations WHERE id = $1 AND account_id = $2`,
    [params.conversationId, params.accountId]
  );
  const agentId = conv[0]?.assignee_id ?? null;

  const rows = await db.unsafe(
    `INSERT INTO csat_surveys (account_id, conversation_id, agent_id, rating, comment)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (conversation_id) DO UPDATE SET rating = $4, comment = $5
     RETURNING id, account_id, conversation_id, agent_id, rating, comment, created_at`,
    [params.accountId, params.conversationId, agentId, params.rating, params.comment ?? null]
  );

  return rows[0] as any;
}

/**
 * getCSATSummary — VS-ANALYTICS-002
 * Computes average CSAT rating, response count, and rating breakdown for an account.
 */
export async function getCSATSummary(accountId: number): Promise<{
  averageRating: number;
  totalResponses: number;
  breakdown: Record<number, number>;
}> {
  const summary = await db.unsafe(
    `SELECT COALESCE(AVG(rating), 0) AS avg_rating, COUNT(*) AS total
     FROM csat_surveys
     WHERE account_id = $1`,
    [accountId]
  );

  const breakdownRows = await db.unsafe(
    `SELECT rating, COUNT(*) AS count
     FROM csat_surveys
     WHERE account_id = $1
     GROUP BY rating`,
    [accountId]
  );

  const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of breakdownRows) {
    breakdown[Number(row.rating)] = Number(row.count);
  }

  return {
    averageRating: Math.round(Number(summary[0].avg_rating) * 10) / 10,
    totalResponses: Number(summary[0].total),
    breakdown,
  };
}
