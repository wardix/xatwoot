import { Hono } from "hono";
import { trackCustomerEvent, listCustomerEventsForContact } from "@/db/queries/trackingQueries.ts";
import { authMiddleware } from "@/middleware/auth.ts";
import type { User } from "@/db/queries/userQueries.ts";

const trackingRoutes = new Hono();

/**
 * POST /api/v1/tracking/event — Public event tracking endpoint for Chat Widget / Website
 */
trackingRoutes.post("/event", async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const accountId = Number(body.account_id ?? c.req.query("account_id") ?? 1);
  const contactId = Number(body.contact_id);
  const eventType = String(body.event_type ?? "page_view");

  if (!contactId) {
    return c.json({ error: "contact_id is required" }, 422);
  }

  const tracked = await trackCustomerEvent({
    accountId,
    contactId,
    eventType,
    url: body.url,
    metadata: body.metadata,
  });

  return c.json(tracked, 201);
});

type CRMVariables = { user: User; userId: number; accountId: number };
const crmTrackingRoutes = new Hono<{ Variables: CRMVariables }>();
crmTrackingRoutes.use("*", authMiddleware);

/**
 * GET /api/v1/tracking/contacts/:id/events — Agent Dashboard timeline endpoint
 */
crmTrackingRoutes.get("/contacts/:id/events", async (c) => {
  const accountId = c.get("accountId");
  const contactId = Number(c.req.param("id"));

  if (isNaN(contactId)) {
    return c.json({ error: "Invalid contact ID" }, 400);
  }

  const events = await listCustomerEventsForContact(contactId, accountId);
  return c.json(events, 200);
});

export { trackingRoutes, crmTrackingRoutes };
