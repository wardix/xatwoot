import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth.ts";
import {
  createAutomationRule,
  listAutomationRules,
  deleteAutomationRule,
  evaluateAutomationRules,
} from "@/db/queries/automationQueries.ts";
import type { User } from "@/db/queries/userQueries.ts";

type AutomationVariables = { user: User; userId: number; accountId: number };
const automationRoutes = new Hono<{ Variables: AutomationVariables }>();

automationRoutes.use("*", authMiddleware);

// GET /api/v1/automation/rules — list rules
automationRoutes.get("/rules", async (c) => {
  const accountId = c.get("accountId");
  const rules = await listAutomationRules(accountId);
  return c.json(rules, 200);
});

// POST /api/v1/automation/rules — create a rule
automationRoutes.post("/rules", async (c) => {
  const accountId = c.get("accountId");
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.name || !Array.isArray(body.conditions) || !Array.isArray(body.actions)) {
    return c.json({ error: "name, conditions array, and actions array are required" }, 422);
  }

  const rule = await createAutomationRule({
    accountId,
    name: body.name,
    description: body.description,
    eventType: body.event_type,
    conditions: body.conditions,
    actions: body.actions,
  });

  return c.json(rule, 201);
});

// DELETE /api/v1/automation/rules/:id — delete a rule
automationRoutes.delete("/rules/:id", async (c) => {
  const accountId = c.get("accountId");
  const id = Number(c.req.param("id"));

  const deleted = await deleteAutomationRule(id, accountId);
  if (!deleted) {
    return c.json({ error: "Rule not found" }, 404);
  }
  return c.json({ status: "success" }, 200);
});

// POST /api/v1/automation/evaluate — test/evaluate rules manually
automationRoutes.post("/evaluate", async (c) => {
  const accountId = c.get("accountId");
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const result = await evaluateAutomationRules({
    accountId,
    eventType: body.event_type ?? "conversation_created",
    context: body.context ?? {},
  });

  return c.json(result, 200);
});

export { automationRoutes };
