import { Hono } from "hono";
import { listKBArticles, searchRAGKnowledgeBase } from "@/db/queries/ragQueries.ts";

const helpCenterRoutes = new Hono();

/**
 * GET /api/v1/helpcenter/:account_id — Public SEO-friendly Knowledge Base endpoint
 */
helpCenterRoutes.get("/:account_id", async (c) => {
  const accountId = Number(c.req.param("account_id"));
  const query = c.req.query("search") ?? "";

  if (!accountId || isNaN(accountId)) {
    return c.json({ error: "Invalid account_id" }, 400);
  }

  if (query.trim()) {
    const ragResult = await searchRAGKnowledgeBase(accountId, query);
    return c.json(
      {
        account_id: accountId,
        articles: ragResult.matchingArticles,
        search_query: query,
      },
      200
    );
  }

  const articles = await listKBArticles(accountId);
  return c.json(
    {
      account_id: accountId,
      articles,
    },
    200
  );
});

export { helpCenterRoutes };
