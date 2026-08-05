import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { $ZodError } from "zod/v4/core";
import {
  createLabelSchema,
  assignConversationLabelsSchema,
} from "@/schemas/labelSchema.ts";
import {
  createLabel,
  findLabelByName,
  listLabelsByAccount,
  assignLabelsToConversation,
  listConversationLabels,
  removeLabelFromConversation,
} from "@/db/queries/labelQueries.ts";
import { findConversationById } from "@/db/queries/conversationQueries.ts";
import { authMiddleware } from "@/middleware/auth.ts";
import type { User } from "@/db/queries/userQueries.ts";

type LabelVariables = { user: User; userId: number; accountId: number };
const labelRoutes = new Hono<{ Variables: LabelVariables }>();

labelRoutes.use("*", authMiddleware);

function validationError(error: $ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_root";
    if (!details[key]) details[key] = [];
    details[key].push(issue.message);
  }
  return details;
}

// GET /api/v1/labels — list labels in account
labelRoutes.get("/", async (c) => {
  const accountId = c.get("accountId");
  const { data, total } = await listLabelsByAccount(accountId);
  return c.json({ data, meta: { total, page: 1, per_page: 50 } });
});

// POST /api/v1/labels — create label
labelRoutes.post(
  "/",
  zValidator("json", createLabelSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: "Validation Failed", details: validationError(result.error) }, 422);
    }
  }),
  async (c) => {
    const accountId = c.get("accountId");
    const body = c.req.valid("json");

    const existing = await findLabelByName(body.name, accountId);
    if (existing) {
      return c.json(
        { error: "Validation Failed", details: { name: ["Label already exists"] } },
        422
      );
    }

    const label = await createLabel({ ...body, account_id: accountId });
    return c.json(label, 201);
  }
);

// GET /api/v1/conversations/:id/labels — list conversation labels
labelRoutes.get("/:id/labels", async (c) => {
  const accountId = c.get("accountId");
  const convId = Number(c.req.param("id"));
  if (isNaN(convId)) {
    return c.json({ error: "Not Found", message: "Conversation not found" }, 404);
  }

  const conversation = await findConversationById(convId, accountId);
  if (!conversation) {
    return c.json({ error: "Not Found", message: "Conversation not found" }, 404);
  }

  const labels = await listConversationLabels(convId, accountId);
  return c.json(labels);
});

// POST /api/v1/conversations/:id/labels — assign labels to conversation
labelRoutes.post(
  "/:id/labels",
  zValidator("json", assignConversationLabelsSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: "Validation Failed", details: validationError(result.error) }, 422);
    }
  }),
  async (c) => {
    const accountId = c.get("accountId");
    const convId = Number(c.req.param("id"));
    if (isNaN(convId)) {
      return c.json({ error: "Not Found", message: "Conversation not found" }, 404);
    }

    const conversation = await findConversationById(convId, accountId);
    if (!conversation) {
      return c.json({ error: "Not Found", message: "Conversation not found" }, 404);
    }

    const { labels: labelNames } = c.req.valid("json");
    const assigned = await assignLabelsToConversation(convId, labelNames, accountId);
    return c.json(assigned);
  }
);

// DELETE /api/v1/conversations/:id/labels/:label_id — remove label from conversation
labelRoutes.delete("/:id/labels/:label_id", async (c) => {
  const accountId = c.get("accountId");
  const convId = Number(c.req.param("id"));
  const labelId = Number(c.req.param("label_id"));

  if (isNaN(convId) || isNaN(labelId)) {
    return c.json({ error: "Not Found", message: "Resource not found" }, 404);
  }

  const conversation = await findConversationById(convId, accountId);
  if (!conversation) {
    return c.json({ error: "Not Found", message: "Conversation not found" }, 404);
  }

  const removed = await removeLabelFromConversation(convId, labelId, accountId);
  return c.json({ success: true, removed });
});

export { labelRoutes };
