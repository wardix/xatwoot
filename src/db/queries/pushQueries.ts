import db from "../client.ts";

export interface PushSubscriptionRecord {
  id: number;
  user_id: number;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  created_at?: string;
}

export async function savePushSubscription(params: {
  userId: number;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<PushSubscriptionRecord> {
  const existing = await db.unsafe(
    `SELECT id FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2 LIMIT 1`,
    [params.userId, params.endpoint]
  );

  if (existing.length > 0) {
    const updated = await db.unsafe(
      `UPDATE push_subscriptions
       SET keys = $3::jsonb
       WHERE id = $1
       RETURNING id, user_id, endpoint, keys`,
      [existing[0].id, params.userId, JSON.stringify(params.keys)]
    );
    return updated[0] as any;
  }

  const created = await db.unsafe(
    `INSERT INTO push_subscriptions (user_id, endpoint, keys)
     VALUES ($1, $2, $3::jsonb)
     RETURNING id, user_id, endpoint, keys`,
    [params.userId, params.endpoint, JSON.stringify(params.keys)]
  );
  return created[0] as any;
}

export async function getSubscriptionsForUser(userId: number): Promise<PushSubscriptionRecord[]> {
  const rows = await db.unsafe(
    `SELECT id, user_id, endpoint, keys FROM push_subscriptions WHERE user_id = $1`,
    [userId]
  );
  return rows as any;
}
