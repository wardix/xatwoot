import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth.ts";
import { generateAIReplySuggestion, insertBotReply } from "@/db/queries/aiQueries.ts";
import type { User } from "@/db/queries/userQueries.ts";

type AIVariables = { user: User; userId: number; accountId: number };
const aiRoutes = new Hono<{ Variables: AIVariables }>();

aiRoutes.use("*", authMiddleware);

/**
 * POST /api/v1/conversations/:id/suggest-reply — VS-AI-001
 * Generates an AI reply suggestion for the agent based on conversation context.
 */
aiRoutes.post("/:id/suggest-reply", async (c) => {
  const accountId = c.get("accountId");
  const conversationId = Number(c.req.param("id"));

  if (!conversationId) {
    return c.json({ error: "Invalid conversation ID" }, 400);
  }

  const result = await generateAIReplySuggestion(conversationId, accountId);
  return c.json(result, 200);
});

/**
 * POST /api/v1/conversations/:id/auto-reply — VS-AI-001
 * Triggers an automated bot reply with sender_type = 'bot'
 */
aiRoutes.post("/:id/auto-reply", async (c) => {
  const accountId = c.get("accountId");
  const conversationId = Number(c.req.param("id"));

  if (!conversationId) {
    return c.json({ error: "Invalid conversation ID" }, 400);
  }

  const suggestion = await generateAIReplySuggestion(conversationId, accountId);
  const botMessage = await insertBotReply({
    accountId,
    conversationId,
    body: suggestion.suggestion,
  });

  return c.json(botMessage, 201);
});

export { aiRoutes };
