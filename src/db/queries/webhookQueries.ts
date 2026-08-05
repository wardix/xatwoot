import db from "../client.ts";

/**
 * findOrCreateContactByPhone — used by webhook integrations to map external users.
 * Looks up a contact by phone+account, creates one if not found.
 */
export async function findOrCreateContactByPhone(params: {
  accountId: number;
  phone: string;
  name?: string;
}): Promise<{ id: number; name: string; phone_number: string }> {
  const existing = await db.unsafe(
    `SELECT id, name, phone_number FROM contacts
     WHERE account_id = $1 AND phone_number = $2
     LIMIT 1`,
    [params.accountId, params.phone]
  );
  if (existing.length > 0) {
    return existing[0] as any;
  }
  const created = await db.unsafe(
    `INSERT INTO contacts (account_id, name, phone_number)
     VALUES ($1, $2, $3)
     RETURNING id, name, phone_number`,
    [params.accountId, params.name ?? params.phone, params.phone]
  );
  return created[0] as any;
}

/**
 * findOrCreateContactByExternalId — map external platform user IDs (e.g. PSID, WhatsApp ID)
 */
export async function findOrCreateContactByExternalId(params: {
  accountId: number;
  externalId: string;
  name?: string;
  email?: string;
}): Promise<{ id: number; name: string }> {
  // Use a unique email derived from the external ID as a key
  const syntheticEmail = `ext.${params.externalId}@webhook.xatwoot`;
  const existing = await db.unsafe(
    `SELECT id, name FROM contacts
     WHERE account_id = $1 AND email = $2
     LIMIT 1`,
    [params.accountId, syntheticEmail]
  );
  if (existing.length > 0) return existing[0] as any;

  const created = await db.unsafe(
    `INSERT INTO contacts (account_id, name, email)
     VALUES ($1, $2, $3)
     RETURNING id, name`,
    [params.accountId, params.name ?? params.externalId, syntheticEmail]
  );
  return created[0] as any;
}

/**
 * findOrCreateWebhookConversation — route a message into the correct inbox.
 * Uses display_id derived from contact+inbox to de-duplicate.
 */
export async function findOrCreateWebhookConversation(params: {
  accountId: number;
  inboxId: number;
  contactId: number;
}): Promise<{ id: number }> {
  // Look for an open/pending conversation for this contact+inbox
  const existing = await db.unsafe(
    `SELECT id FROM conversations
     WHERE account_id = $1 AND inbox_id = $2 AND contact_id = $3
       AND status IN ('open', 'pending')
     ORDER BY created_at DESC
     LIMIT 1`,
    [params.accountId, params.inboxId, params.contactId]
  );
  if (existing.length > 0) return existing[0] as any;

  // Generate next display_id for this account
  const displayIdRow = await db.unsafe(
    `SELECT COALESCE(MAX(display_id), 0) + 1 AS next_id FROM conversations WHERE account_id = $1`,
    [params.accountId]
  );
  const displayId = Number(displayIdRow[0]?.next_id ?? 1);

  const created = await db.unsafe(
    `INSERT INTO conversations (display_id, account_id, inbox_id, contact_id, status, priority)
     VALUES ($1, $2, $3, $4, 'open', 'medium')
     RETURNING id`,
    [displayId, params.accountId, params.inboxId, params.contactId]
  );
  return created[0] as any;
}

/**
 * insertWebhookMessage — insert an inbound message from an external platform
 */
export async function insertWebhookMessage(params: {
  accountId: number;
  conversationId: number;
  contactId: number;
  body: string;
}): Promise<{ id: number }> {
  const created = await db.unsafe(
    `INSERT INTO messages (account_id, conversation_id, sender_type, sender_id, body)
     VALUES ($1, $2, 'contact', $3, $4)
     RETURNING id`,
    [params.accountId, params.conversationId, params.contactId, params.body]
  );
  return created[0] as any;
}
