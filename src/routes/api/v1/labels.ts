import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth.ts";
import {
  createLabel,
  listAccountLabels,
  attachLabelToConversation,
  removeLabelFromConversation,
  listConversationLabels,
  updateConversationCustomAttributes,
} from "@/db/queries/labelQueries.ts";
import type { User } from "@/db/queries/userQueries.ts";

type LabelVariables = { user: User; userId: number; accountId: number };
const labelRoutes = new Hono<{ Variables: LabelVariables }>();

labelRoutes.use("*", authMiddleware);

// GET /api/v1/labels — List account labels
labelRoutes.get("/", async (c) => {
  const accountId = c.get("accountId");
  const labels = await listAccountLabels(accountId);
  return c.json(labels, 200);
});

// POST /api/v1/labels — Create new colored label
labelRoutes.post("/", async (c) => {
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

  const label = await createLabel({
    accountId,
    name: body.name,
    color: body.color,
  });

  return c.json(label, 201);
});

// GET /api/v1/labels/conversations/:id — List labels for a conversation
labelRoutes.get("/conversations/:id", async (c) => {
  const conversationId = Number(c.req.param("id"));
  const labels = await listConversationLabels(conversationId);
  return c.json(labels, 200);
});

// POST /api/v1/labels/conversations/:id/attach — Attach label to conversation
labelRoutes.post("/conversations/:id/attach", async (c) => {
  const conversationId = Number(c.req.param("id"));
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.label_id) {
    return c.json({ error: "label_id is required" }, 422);
  }

  await attachLabelToConversation(conversationId, Number(body.label_id));
  return c.json({ status: "success" }, 200);
});

// POST /api/v1/labels/conversations/:id/detach — Detach label from conversation
labelRoutes.post("/conversations/:id/detach", async (c) => {
  const conversationId = Number(c.req.param("id"));
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.label_id) {
    return c.json({ error: "label_id is required" }, 422);
  }

  await removeLabelFromConversation(conversationId, Number(body.label_id));
  return c.json({ status: "success" }, 200);
});

// POST /api/v1/labels/conversations/:id/attributes — Update conversation custom attributes
labelRoutes.post("/conversations/:id/attributes", async (c) => {
  const accountId = c.get("accountId");
  const conversationId = Number(c.req.param("id"));
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const updatedAttrs = await updateConversationCustomAttributes(conversationId, accountId, body.custom_attributes ?? {});
  return c.json({ custom_attributes: updatedAttrs }, 200);
});

export { labelRoutes };
