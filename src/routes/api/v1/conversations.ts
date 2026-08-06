import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { $ZodError } from "zod/v4/core";
import {
  createConversationSchema,
  updateConversationSchema,
} from "@/schemas/conversationSchema.ts";
import {
  createConversation,
  listConversations,
  findConversationById,
  updateConversation,
  type Conversation,
} from "@/db/queries/conversationQueries.ts";
import { authMiddleware } from "@/middleware/auth.ts";
import { searchConversations } from "@/db/queries/searchQueries.ts";
import type { User } from "@/db/queries/userQueries.ts";

type ConvVariables = { user: User; userId: number; accountId: number };
const conversationRoutes = new Hono<{ Variables: ConvVariables }>();

conversationRoutes.use("*", authMiddleware);

function validationError(error: $ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_root";
    if (!details[key]) details[key] = [];
    details[key].push(issue.message);
  }
  return details;
}

// POST /api/v1/conversations
conversationRoutes.post(
  "/",
  zValidator("json", createConversationSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: "Validation Failed", details: validationError(result.error) }, 422);
    }
  }),
  async (c) => {
    const accountId = c.get("accountId");
    const body = c.req.valid("json");

    const conversation = await createConversation({ ...body, account_id: accountId });
    return c.json(conversation, 201);
  }
);

// GET /api/v1/conversations/search?q=... — full-text search across subject and messages
conversationRoutes.get("/search", async (c) => {
  const accountId = c.get("accountId");
  const q = c.req.query("q");
  if (!q || !q.trim()) {
    return c.json({ error: "Validation Failed", details: { q: ["Query parameter 'q' is required"] } }, 422);
  }

  const page = Math.max(1, Number(c.req.query("page") ?? 1));
  const perPage = 20;
  const offset = (page - 1) * perPage;

  const { data, total } = await searchConversations(accountId, q, perPage, offset);
  return c.json({ data, meta: { total, page, per_page: perPage } });
});

// GET /api/v1/conversations
conversationRoutes.get("/", async (c) => {
  const accountId = c.get("accountId");
  const inboxIdStr = c.req.query("inbox_id");
  const statusStr = c.req.query("status");
  const assigneeIdStr = c.req.query("assignee_id");
  const label = c.req.query("label");
  const page = Math.max(1, Number(c.req.query("page") ?? 1));
  const perPage = 20;
  const offset = (page - 1) * perPage;

  const inbox_id = inboxIdStr ? Number(inboxIdStr) : undefined;
  const assignee_id = assigneeIdStr ? Number(assigneeIdStr) : undefined;
  const status = statusStr as Conversation["status"] | undefined;

  const { data, total } = await listConversations(accountId, {
    inbox_id,
    status,
    assignee_id,
    label,
    limit: perPage,
    offset,
  });

  return c.json({ data, meta: { total, page, per_page: perPage } });
});

// GET /api/v1/conversations/:id
conversationRoutes.get("/:id", async (c) => {
  const accountId = c.get("accountId");
  const id = Number(c.req.param("id"));
  if (isNaN(id)) {
    return c.json({ error: "Not Found", message: "Conversation not found" }, 404);
  }

  const conversation = await findConversationById(id, accountId);
  if (!conversation) {
    return c.json({ error: "Not Found", message: "Conversation not found" }, 404);
  }

  return c.json(conversation);
});

// PUT /api/v1/conversations/:id
conversationRoutes.put(
  "/:id",
  zValidator("json", updateConversationSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: "Validation Failed", details: validationError(result.error) }, 422);
    }
  }),
  async (c) => {
    const accountId = c.get("accountId");
    const id = Number(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ error: "Not Found", message: "Conversation not found" }, 404);
    }

    const body = c.req.valid("json");
    const conversation = await updateConversation(id, accountId, body);
    if (!conversation) {
      return c.json({ error: "Not Found", message: "Conversation not found" }, 404);
    }

    // Trigger CSAT Survey survey message when conversation is resolved — VS-ANALYTICS-002
    if (body.status === "resolved") {
      const { insertBotReply } = await import("@/db/queries/aiQueries.ts");
      await insertBotReply({
        accountId,
        conversationId: id,
        body: "🌟 How would you rate your support experience today? (1-5 Stars)",
      });
    }

    return c.json(conversation);
  }
);

/**
 * POST /api/v1/conversations/:id/csat — Submit CSAT Survey rating and comment
 */
conversationRoutes.post("/:id/csat", async (c) => {
  const accountId = c.get("accountId");
  const conversationId = Number(c.req.param("id"));

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const rating = Number(body.rating);
  if (isNaN(rating) || rating < 1 || rating > 5) {
    return c.json({ error: "Rating must be an integer between 1 and 5" }, 422);
  }

  const { submitCSATSurvey } = await import("@/db/queries/csatQueries.ts");
  const survey = await submitCSATSurvey({
    accountId,
    conversationId,
    rating,
    comment: body.comment,
  });

  return c.json(survey, 201);
});

/**
 * GET /api/v1/conversations/csat/summary — Retrieve CSAT analytics summary
 */
conversationRoutes.get("/csat/summary", async (c) => {
  const accountId = c.get("accountId");
  const { getCSATSummary } = await import("@/db/queries/csatQueries.ts");
  const summary = await getCSATSummary(accountId);
  return c.json(summary, 200);
});

export { conversationRoutes };
