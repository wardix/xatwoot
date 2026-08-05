import db from "../client.ts";

export interface RuleCondition {
  field: "status" | "priority" | "subject" | "message_body";
  operator: "equals" | "contains" | "starts_with";
  value: string;
}

export interface RuleAction {
  type: "assign_team" | "add_label" | "send_canned_response" | "close_conversation" | "change_priority";
  payload: any;
}

export interface AutomationRule {
  id: number;
  account_id: number;
  name: string;
  description?: string;
  event_type: "conversation_created" | "message_created";
  conditions: RuleCondition[];
  actions: RuleAction[];
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function createAutomationRule(params: {
  accountId: number;
  name: string;
  description?: string;
  eventType?: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
}): Promise<AutomationRule> {
  const rows = await db.unsafe(
    `INSERT INTO automation_rules (account_id, name, description, event_type, conditions, actions)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
     RETURNING id, account_id, name, description, event_type, conditions, actions, active, created_at, updated_at`,
    [
      params.accountId,
      params.name,
      params.description ?? null,
      params.eventType ?? "conversation_created",
      JSON.stringify(params.conditions),
      JSON.stringify(params.actions),
    ]
  );
  return rows[0] as any;
}

export async function listAutomationRules(accountId: number): Promise<AutomationRule[]> {
  const rows = await db.unsafe(
    `SELECT id, account_id, name, description, event_type, conditions, actions, active, created_at, updated_at
     FROM automation_rules
     WHERE account_id = $1
     ORDER BY created_at DESC`,
    [accountId]
  );
  return rows as any;
}

export async function deleteAutomationRule(id: number, accountId: number): Promise<boolean> {
  const res = await db.unsafe(
    `DELETE FROM automation_rules WHERE id = $1 AND account_id = $2 RETURNING id`,
    [id, accountId]
  );
  return res.length > 0;
}

/**
 * evaluateAutomationRules — VS-AUTOMATION-001 Engine
 * Evaluates active rules against an event context (conversation or message) and executes actions.
 */
export async function evaluateAutomationRules(params: {
  accountId: number;
  eventType: "conversation_created" | "message_created";
  context: {
    conversationId: number;
    status?: string;
    priority?: string;
    subject?: string;
    messageBody?: string;
  };
}): Promise<{ executedRulesCount: number; actionsTaken: string[] }> {
  const rules = await db.unsafe(
    `SELECT id, name, conditions, actions FROM automation_rules
     WHERE account_id = $1 AND active = true AND event_type = $2`,
    [params.accountId, params.eventType]
  );

  let executedRulesCount = 0;
  const actionsTaken: string[] = [];

  for (const rule of rules) {
    const conditions: RuleCondition[] = typeof rule.conditions === "string" ? JSON.parse(rule.conditions) : rule.conditions;
    const actions: RuleAction[] = typeof rule.actions === "string" ? JSON.parse(rule.actions) : rule.actions;

    // Check if ALL conditions match (AND logic)
    const matchesAll = conditions.every((cond) => {
      let fieldValue = "";
      if (cond.field === "status") fieldValue = params.context.status ?? "";
      else if (cond.field === "priority") fieldValue = params.context.priority ?? "";
      else if (cond.field === "subject") fieldValue = params.context.subject ?? "";
      else if (cond.field === "message_body") fieldValue = params.context.messageBody ?? "";

      const condVal = cond.value.toLowerCase();
      const targetVal = fieldValue.toLowerCase();

      if (cond.operator === "equals") return targetVal === condVal;
      if (cond.operator === "contains") return targetVal.includes(condVal);
      if (cond.operator === "starts_with") return targetVal.startsWith(condVal);
      return false;
    });

    if (matchesAll && conditions.length > 0) {
      executedRulesCount++;
      for (const action of actions) {
        if (action.type === "close_conversation") {
          await db.unsafe(`UPDATE conversations SET status = 'resolved' WHERE id = $1`, [params.context.conversationId]);
          actionsTaken.push(`Rule '${rule.name}': Closed conversation #${params.context.conversationId}`);
        } else if (action.type === "change_priority") {
          await db.unsafe(`UPDATE conversations SET priority = $1 WHERE id = $2`, [action.payload?.priority ?? "high", params.context.conversationId]);
          actionsTaken.push(`Rule '${rule.name}': Changed priority to ${action.payload?.priority}`);
        } else if (action.type === "send_canned_response") {
          const bodyText = action.payload?.text ?? "Automated Response: Thank you for your inquiry!";
          await db.unsafe(
            `INSERT INTO messages (account_id, conversation_id, sender_type, sender_id, body)
             VALUES ($1, $2, 'bot', 0, $3)`,
            [params.accountId, params.context.conversationId, bodyText]
          );
          actionsTaken.push(`Rule '${rule.name}': Sent automated response`);
        }
      }
    }
  }

  return { executedRulesCount, actionsTaken };
}
