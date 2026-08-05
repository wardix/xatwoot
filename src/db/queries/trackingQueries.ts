import db from "../client.ts";

export interface CustomerEvent {
  id: number;
  account_id: number;
  contact_id: number;
  event_type: string;
  url?: string;
  metadata: Record<string, any>;
  created_at: string;
}

/**
 * trackCustomerEvent — VS-CRM-001
 */
export async function trackCustomerEvent(params: {
  accountId: number;
  contactId: number;
  eventType: string;
  url?: string;
  metadata?: Record<string, any>;
}): Promise<CustomerEvent> {
  const rows = await db.unsafe(
    `INSERT INTO customer_events (account_id, contact_id, event_type, url, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING id, account_id, contact_id, event_type, url, metadata, created_at`,
    [
      params.accountId,
      params.contactId,
      params.eventType,
      params.url ?? null,
      JSON.stringify(params.metadata ?? {}),
    ]
  );
  return rows[0] as any;
}

/**
 * listCustomerEventsForContact — VS-CRM-001
 * Retrieves chronological event timeline for a contact.
 */
export async function listCustomerEventsForContact(
  contactId: number,
  accountId: number
): Promise<CustomerEvent[]> {
  const rows = await db.unsafe(
    `SELECT id, account_id, contact_id, event_type, url, metadata, created_at
     FROM customer_events
     WHERE contact_id = $1 AND account_id = $2
     ORDER BY created_at DESC
     LIMIT 50`,
    [contactId, accountId]
  );
  return rows.map((r: any) => ({
    id: Number(r.id),
    account_id: Number(r.account_id),
    contact_id: Number(r.contact_id),
    event_type: String(r.event_type),
    url: r.url,
    metadata: typeof r.metadata === "string" ? JSON.parse(r.metadata) : r.metadata,
    created_at: r.created_at,
  }));
}
