import db from "../client.ts";

export interface Label {
  id: number;
  account_id: number;
  name: string;
  color?: string;
  created_at?: string;
}

/**
 * createLabel — VS-CRM-002
 */
export async function createLabel(params: {
  accountId: number;
  name: string;
  color?: string;
}): Promise<Label> {
  const rows = await db.unsafe(
    `INSERT INTO labels (account_id, name, color)
     VALUES ($1, $2, $3)
     ON CONFLICT (account_id, name) DO UPDATE SET color = EXCLUDED.color
     RETURNING id, account_id, name, color, created_at`,
    [params.accountId, params.name, params.color ?? "#3b82f6"]
  );
  return rows[0] as any;
}

/**
 * listAccountLabels — VS-CRM-002
 */
export async function listAccountLabels(accountId: number): Promise<Label[]> {
  const rows = await db.unsafe(
    `SELECT id, account_id, name, color, created_at
     FROM labels
     WHERE account_id = $1
     ORDER BY name ASC`,
    [accountId]
  );
  return rows as any;
}

/**
 * attachLabelToConversation — VS-CRM-002
 */
export async function attachLabelToConversation(conversationId: number, labelId: number): Promise<void> {
  await db.unsafe(
    `INSERT INTO conversation_labels (conversation_id, label_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [conversationId, labelId]
  );
}

/**
 * removeLabelFromConversation — VS-CRM-002
 */
export async function removeLabelFromConversation(conversationId: number, labelId: number): Promise<void> {
  await db.unsafe(
    `DELETE FROM conversation_labels WHERE conversation_id = $1 AND label_id = $2`,
    [conversationId, labelId]
  );
}

/**
 * listConversationLabels — VS-CRM-002
 */
export async function listConversationLabels(conversationId: number): Promise<Label[]> {
  const rows = await db.unsafe(
    `SELECT l.id, l.account_id, l.name, l.color
     FROM labels l
     JOIN conversation_labels cl ON cl.label_id = l.id
     WHERE cl.conversation_id = $1`,
    [conversationId]
  );
  return rows as any;
}

/**
 * updateConversationCustomAttributes — VS-CRM-002
 */
export async function updateConversationCustomAttributes(
  conversationId: number,
  accountId: number,
  attributes: Record<string, any>
): Promise<Record<string, any>> {
  const convId = Number(conversationId);
  const accId = Number(accountId);
  await db.unsafe(
    `UPDATE conversations
     SET custom_attributes = COALESCE(custom_attributes, '{}'::jsonb) || $3::jsonb
     WHERE id = $1 AND account_id = $2`,
    [convId, accId, JSON.stringify(attributes)]
  );
  const rows = await db.unsafe(
    `SELECT custom_attributes FROM conversations WHERE id = $1 AND account_id = $2`,
    [convId, accId]
  );
  let raw = rows[0]?.custom_attributes;
  if (Array.isArray(raw)) {
    raw = raw.find((item) => typeof item === "string" && item !== "{}") ?? raw[raw.length - 1];
  }
  return typeof raw === "string" ? JSON.parse(raw) : (raw ?? {});
}
