import db from "../client.ts";

export interface Label {
  id: number;
  account_id: number;
  name: string;
  color: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateLabelInput {
  account_id: number;
  name: string;
  color?: string;
}

export async function createLabel(input: CreateLabelInput): Promise<Label> {
  const { account_id, name, color = "#1f93ff" } = input;
  const rows = await db.unsafe(
    `INSERT INTO labels (account_id, name, color)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [account_id, name, color]
  );
  return rows[0] as Label;
}

export async function findLabelByName(name: string, account_id: number): Promise<Label | null> {
  const rows = await db.unsafe(
    `SELECT * FROM labels WHERE name = $1 AND account_id = $2 LIMIT 1`,
    [name, account_id]
  );
  return (rows[0] as Label) ?? null;
}

export async function findLabelById(id: number, account_id: number): Promise<Label | null> {
  const rows = await db.unsafe(
    `SELECT * FROM labels WHERE id = $1 AND account_id = $2 LIMIT 1`,
    [id, account_id]
  );
  return (rows[0] as Label) ?? null;
}

export async function listLabelsByAccount(
  account_id: number,
  limit = 50,
  offset = 0
): Promise<{ data: Label[]; total: number }> {
  const [rows, countRows] = await Promise.all([
    db.unsafe(`SELECT * FROM labels WHERE account_id = $1 ORDER BY name ASC LIMIT $2 OFFSET $3`, [
      account_id,
      limit,
      offset,
    ]),
    db.unsafe(`SELECT COUNT(*)::int AS total FROM labels WHERE account_id = $1`, [account_id]),
  ]);
  return {
    data: rows as Label[],
    total: (countRows[0] as { total: number }).total,
  };
}

export async function assignLabelsToConversation(
  conversation_id: number,
  labelNames: string[],
  account_id: number
): Promise<Label[]> {
  for (const name of labelNames) {
    let label = await findLabelByName(name, account_id);
    if (!label) {
      label = await createLabel({ account_id, name });
    }
    await db.unsafe(
      `INSERT INTO conversation_labels (conversation_id, label_id)
       VALUES ($1, $2)
       ON CONFLICT (conversation_id, label_id) DO NOTHING`,
      [conversation_id, label.id]
    );
  }
  return listConversationLabels(conversation_id, account_id);
}

export async function listConversationLabels(
  conversation_id: number,
  account_id: number
): Promise<Label[]> {
  const rows = await db.unsafe(
    `SELECT l.* FROM labels l
     JOIN conversation_labels cl ON l.id = cl.label_id
     WHERE cl.conversation_id = $1 AND l.account_id = $2
     ORDER BY l.name ASC`,
    [conversation_id, account_id]
  );
  return rows as Label[];
}

export async function removeLabelFromConversation(
  conversation_id: number,
  label_id: number,
  account_id: number
): Promise<boolean> {
  const rows = await db.unsafe(
    `DELETE FROM conversation_labels cl
     USING labels l
     WHERE cl.label_id = l.id
       AND cl.conversation_id = $1
       AND cl.label_id = $2
       AND l.account_id = $3
     RETURNING cl.label_id`,
    [conversation_id, label_id, account_id]
  );
  return rows.length > 0;
}
