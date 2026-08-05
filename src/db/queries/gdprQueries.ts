import db from "../client.ts";

export async function exportAccountData(account_id: number) {
  const [accountRows, contactsRows, convsRows, msgsRows, inboxesRows, labelsRows] = await Promise.all([
    db.unsafe(`SELECT id, name, email, phone_number, domain, support_email, locale, created_at FROM accounts WHERE id = $1`, [account_id]),
    db.unsafe(`SELECT id, name, email, phone_number, avatar_url, additional_attributes, created_at FROM contacts WHERE account_id = $1`, [account_id]),
    db.unsafe(`SELECT id, display_id, inbox_id, contact_id, assignee_id, status, priority, subject, created_at FROM conversations WHERE account_id = $1`, [account_id]),
    db.unsafe(`SELECT id, conversation_id, sender_type, sender_id, body, message_type, status, created_at FROM messages WHERE account_id = $1`, [account_id]),
    db.unsafe(`SELECT id, name, channel_type, enabled, created_at FROM inboxes WHERE account_id = $1`, [account_id]),
    db.unsafe(`SELECT id, name, color, created_at FROM labels WHERE account_id = $1`, [account_id]),
  ]);

  return {
    account: accountRows[0] ?? null,
    contacts: contactsRows,
    conversations: convsRows,
    messages: msgsRows,
    inboxes: inboxesRows,
    labels: labelsRows,
    exported_at: new Date().toISOString(),
  };
}

export async function anonymizeContact(id: number, account_id: number): Promise<boolean> {
  const rows = await db.unsafe(
    `UPDATE contacts
     SET name = 'Deleted User',
         email = NULL,
         phone_number = NULL,
         avatar_url = NULL,
         additional_attributes = '{}'::jsonb,
         updated_at = NOW()
     WHERE id = $1 AND account_id = $2
     RETURNING id`,
    [id, account_id]
  );
  return rows.length > 0;
}
