import db from "../client.ts";

export interface SLAPolicy {
  id: number;
  account_id: number;
  name: string;
  description?: string;
  first_response_time_threshold_minutes: number;
  resolution_time_threshold_minutes: number;
  priority: string;
  active: boolean;
  created_at?: string;
}

export async function createSLAPolicy(params: {
  accountId: number;
  name: string;
  description?: string;
  frtMinutes?: number;
  artMinutes?: number;
  priority?: string;
}): Promise<SLAPolicy> {
  const rows = await db.unsafe(
    `INSERT INTO sla_policies (account_id, name, description, first_response_time_threshold_minutes, resolution_time_threshold_minutes, priority)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, account_id, name, description, first_response_time_threshold_minutes, resolution_time_threshold_minutes, priority, active, created_at`,
    [
      params.accountId,
      params.name,
      params.description ?? null,
      params.frtMinutes ?? 15,
      params.artMinutes ?? 120,
      params.priority ?? "urgent",
    ]
  );
  return rows[0] as any;
}

export async function listSLAPolicies(accountId: number): Promise<SLAPolicy[]> {
  const rows = await db.unsafe(
    `SELECT id, account_id, name, description, first_response_time_threshold_minutes, resolution_time_threshold_minutes, priority, active, created_at
     FROM sla_policies
     WHERE account_id = $1
     ORDER BY created_at DESC`,
    [accountId]
  );
  return rows as any;
}

export async function deleteSLAPolicy(policyId: number, accountId: number): Promise<boolean> {
  const res = await db.unsafe(
    `DELETE FROM sla_policies WHERE id = $1 AND account_id = $2 RETURNING id`,
    [policyId, accountId]
  );
  return res.length > 0;
}

/**
 * checkAndEscalateSLABreaches — VS-CORE-003
 * Evaluates open conversations against active SLA policies and auto-escalates breached tickets.
 */
export async function checkAndEscalateSLABreaches(accountId: number): Promise<{
  checkedCount: number;
  breachedCount: number;
  escalatedConversationIds: number[];
}> {
  const policies = await listSLAPolicies(accountId);
  const frtThreshold = policies.length > 0 ? policies[0].first_response_time_threshold_minutes : 15;

  // Find open conversations created longer ago than FRT threshold without agent response
  const breachedConversations = await db.unsafe(
    `SELECT c.id, c.subject, c.created_at
     FROM conversations c
     WHERE c.account_id = $1
       AND c.status IN ('open', 'pending')
       AND c.created_at < (NOW() - ($2 || ' minutes')::interval)
       AND NOT EXISTS (
         SELECT 1 FROM messages m
         WHERE m.conversation_id = c.id AND m.sender_type IN ('user', 'bot')
       )`,
    [accountId, frtThreshold]
  );

  const escalatedConversationIds: number[] = [];

  for (const conv of breachedConversations) {
    const convId = Number(conv.id);
    escalatedConversationIds.push(convId);

    // Update conversation priority to urgent and mark as SLA Breached
    await db.unsafe(
      `UPDATE conversations
       SET priority = 'urgent', subject = COALESCE(subject, '') || ' [SLA BREACHED]', updated_at = NOW()
       WHERE id = $1 AND account_id = $2`,
      [convId, accountId]
    );

    // Insert bot alert message into chat
    await db.unsafe(
      `INSERT INTO messages (account_id, conversation_id, sender_type, sender_id, body)
       VALUES ($1, $2, 'bot', 0, $3)`,
      [accountId, convId, `⚠️ SLA BREACH ALERT: First response time threshold (${frtThreshold}m) exceeded. Ticket auto-escalated to URGENT.`]
    );
  }

  return {
    checkedCount: breachedConversations.length,
    breachedCount: breachedConversations.length,
    escalatedConversationIds,
  };
}
