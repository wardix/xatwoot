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
 * POST /api/v1/conversations/:id/auto-reply — VS-AI-002 (RAG-Enhanced Auto Reply)
 * Queries the Knowledge Base vector/text store to synthesize an accurate response based on company documentation.
 */
aiRoutes.post("/:id/auto-reply", async (c) => {
  const accountId = c.get("accountId");
  const conversationId = Number(c.req.param("id"));

  if (!conversationId) {
    return c.json({ error: "Invalid conversation ID" }, 400);
  }

  const { searchRAGKnowledgeBase } = await import("@/db/queries/ragQueries.ts");

  // Fetch last message for context
  const suggestion = await generateAIReplySuggestion(conversationId, accountId);
  const ragResult = await searchRAGKnowledgeBase(accountId, suggestion.suggestion);

  let replyText = suggestion.suggestion;
  if (ragResult.matchingArticles.length > 0) {
    const topDoc = ragResult.matchingArticles[0];
    replyText = `Based on our documentation (${topDoc.title}):\n${topDoc.content.slice(0, 300)}...\n\nDoes this help resolve your question?`;
  }

  const botMessage = await insertBotReply({
    accountId,
    conversationId,
    body: replyText,
  });

  return c.json({ ...botMessage, rag_sources: ragResult.matchingArticles.map((a) => a.title) }, 201);
});

/**
 * GET /api/v1/conversations/knowledge-base — List Knowledge Base articles
 */
aiRoutes.get("/knowledge-base", async (c) => {
  const accountId = c.get("accountId");
  const { listKBArticles } = await import("@/db/queries/ragQueries.ts");
  const articles = await listKBArticles(accountId);
  return c.json(articles, 200);
});

/**
 * POST /api/v1/conversations/knowledge-base — Create Knowledge Base article
 */
aiRoutes.post("/knowledge-base", async (c) => {
  const accountId = c.get("accountId");
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.title || !body.content) {
    return c.json({ error: "title and content are required" }, 422);
  }

  const { createKBArticle } = await import("@/db/queries/ragQueries.ts");
  const article = await createKBArticle({
    accountId,
    title: body.title,
    category: body.category,
    content: body.content,
    keywords: body.keywords,
  });

  return c.json(article, 201);
});

/**
 * DELETE /api/v1/conversations/knowledge-base/:id — Delete Knowledge Base article
 */
aiRoutes.delete("/knowledge-base/:id", async (c) => {
  const accountId = c.get("accountId");
  const id = Number(c.req.param("id"));

  const { deleteKBArticle } = await import("@/db/queries/ragQueries.ts");
  const deleted = await deleteKBArticle(id, accountId);
  if (!deleted) {
    return c.json({ error: "Article not found" }, 404);
  }
  return c.json({ status: "success" }, 200);
});

export { aiRoutes };
