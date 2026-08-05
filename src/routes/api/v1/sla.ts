import { Hono } from "hono";
import { authMiddleware, requirePermission } from "@/middleware/auth.ts";
import {
  createSLAPolicy,
  listSLAPolicies,
  deleteSLAPolicy,
  checkAndEscalateSLABreaches,
} from "@/db/queries/slaQueries.ts";
import type { User } from "@/db/queries/userQueries.ts";

type SLAVariables = { user: User; userId: number; accountId: number };
const slaRoutes = new Hono<{ Variables: SLAVariables }>();

slaRoutes.use("*", authMiddleware);

// GET /api/v1/sla/policies — list SLA policies
slaRoutes.get("/policies", async (c) => {
  const accountId = c.get("accountId");
  const policies = await listSLAPolicies(accountId);
  return c.json(policies, 200);
});

// POST /api/v1/sla/policies — create SLA policy
slaRoutes.post("/policies", async (c) => {
  const accountId = c.get("accountId");
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.name) {
    return c.json({ error: "name is required" }, 422);
  }

  const policy = await createSLAPolicy({
    accountId,
    name: body.name,
    description: body.description,
    frtMinutes: Number(body.first_response_time_threshold_minutes ?? 15),
    artMinutes: Number(body.resolution_time_threshold_minutes ?? 120),
    priority: body.priority,
  });

  return c.json(policy, 201);
});

// DELETE /api/v1/sla/policies/:id — delete SLA policy
slaRoutes.delete("/policies/:id", async (c) => {
  const accountId = c.get("accountId");
  const id = Number(c.req.param("id"));

  const deleted = await deleteSLAPolicy(id, accountId);
  if (!deleted) {
    return c.json({ error: "SLA policy not found" }, 404);
  }
  return c.json({ status: "success" }, 200);
});

// POST /api/v1/sla/check-breaches — run SLA breach check worker
slaRoutes.post("/check-breaches", async (c) => {
  const accountId = c.get("accountId");
  const result = await checkAndEscalateSLABreaches(accountId);
  return c.json(result, 200);
});

export { slaRoutes };
