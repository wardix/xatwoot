import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth.ts";
import {
  getAccountIntegrations,
  saveAccountIntegrations,
  notifySlackHighPriorityConversation,
  createJiraTicketFromConversation,
} from "@/db/queries/integrationQueries.ts";
import type { User } from "@/db/queries/userQueries.ts";

type IntegrationVariables = { user: User; userId: number; accountId: number };
const integrationRoutes = new Hono<{ Variables: IntegrationVariables }>();

integrationRoutes.use("*", authMiddleware);

// GET /api/v1/integrations — fetch account Slack & Jira settings
integrationRoutes.get("/", async (c) => {
  const accountId = c.get("accountId");
  const config = await getAccountIntegrations(accountId);
  return c.json(config, 200);
});

// PUT /api/v1/integrations — save account Slack & Jira settings
integrationRoutes.put("/", async (c) => {
  const accountId = c.get("accountId");
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const updated = await saveAccountIntegrations(accountId, body);
  return c.json(updated, 200);
});

// POST /api/v1/integrations/jira/ticket — create Jira issue from conversation
integrationRoutes.post("/jira/ticket", async (c) => {
  const accountId = c.get("accountId");
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.conversation_id || !body.summary) {
    return c.json({ error: "conversation_id and summary are required" }, 422);
  }

  const ticket = await createJiraTicketFromConversation({
    accountId,
    conversationId: Number(body.conversation_id),
    summary: String(body.summary),
    description: String(body.description ?? body.summary),
  });

  return c.json(ticket, 201);
});

// POST /api/v1/integrations/slack/notify — trigger test Slack alert
integrationRoutes.post("/slack/notify", async (c) => {
  const accountId = c.get("accountId");
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  const sent = await notifySlackHighPriorityConversation({
    accountId,
    conversationId: Number(body.conversation_id ?? 1),
    subject: String(body.subject ?? "Test High Priority Alert"),
    priority: String(body.priority ?? "urgent"),
  });

  return c.json({ sent }, 200);
});

export { integrationRoutes };
