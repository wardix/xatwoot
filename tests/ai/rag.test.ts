import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { createKBArticle, searchRAGKnowledgeBase } from "../../src/db/queries/ragQueries.ts";

describe("AI Knowledge Base & RAG Support (VS-AI-002)", () => {
  describe("RAG search & KB article queries", () => {
    it("createKBArticle creates an article and searchRAGKnowledgeBase retrieves matching context", async () => {
      const title = `Pricing & Plans ${Date.now()}`;
      const article = await createKBArticle({
        accountId: 1,
        title,
        category: "Billing",
        content: "Our Enterprise Plan costs $99 per month and includes unlimited agents.",
        keywords: ["pricing", "cost", "enterprise"],
      });

      expect(article).toBeDefined();
      expect(article.title).toBe(title);

      const rag = await searchRAGKnowledgeBase(1, "What is the enterprise pricing?");
      expect(rag.matchingArticles.length).toBeGreaterThan(0);
      expect(rag.contextSnippet).toContain("Enterprise Plan");
    });
  });

  describe("Knowledge Base REST API Endpoints", () => {
    it("GET /conversations/knowledge-base returns 401 unauthenticated without JWT", async () => {
      const { aiRoutes } = await import("../../src/routes/api/v1/ai.ts");
      const app = new Hono();
      app.route("/conversations", aiRoutes);

      const res = await app.request("/conversations/knowledge-base");
      expect(res.status).toBe(401);
    });

    it("POST /conversations/knowledge-base returns 401 unauthenticated without JWT", async () => {
      const { aiRoutes } = await import("../../src/routes/api/v1/ai.ts");
      const app = new Hono();
      app.route("/conversations", aiRoutes);

      const res = await app.request("/conversations/knowledge-base", { method: "POST" });
      expect(res.status).toBe(401);
    });
  });
});
