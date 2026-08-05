import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth.ts";
import { savePushSubscription, getSubscriptionsForUser } from "@/db/queries/pushQueries.ts";
import type { User } from "@/db/queries/userQueries.ts";

type PushVariables = { user: User; userId: number; accountId: number };
const pushRoutes = new Hono<{ Variables: PushVariables }>();

pushRoutes.use("*", authMiddleware);

/**
 * POST /api/v1/push/subscriptions — Save web push subscription
 */
pushRoutes.post("/subscriptions", async (c) => {
  const userId = c.get("userId");
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return c.json({ error: "endpoint and keys (p256dh, auth) are required" }, 422);
  }

  const sub = await savePushSubscription({
    userId,
    endpoint: body.endpoint,
    keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
  });

  return c.json(sub, 201);
});

/**
 * GET /api/v1/push/subscriptions — Get agent push subscriptions
 */
pushRoutes.get("/subscriptions", async (c) => {
  const userId = c.get("userId");
  const subs = await getSubscriptionsForUser(userId);
  return c.json(subs, 200);
});

export { pushRoutes };
