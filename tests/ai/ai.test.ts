import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { generateAIReplySuggestion } from "../../src/db/queries/aiQueries.ts";

describe("AI Auto-Reply & Reply Suggestions (VS-AI-001)", () => {
  describe("generateAIReplySuggestion function", () => {
    it("returns a default friendly suggestion for empty conversation", async () => {
      const result = await generateAIReplySuggestion(999999, 999999);
      expect(result).toBeDefined();
      expect(result.suggestion).toContain("Hello");
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe("AI API Routes", () => {
    it("POST /suggest-reply returns 401 unauthenticated without token", async () => {
      const { aiRoutes } = await import("../../src/routes/api/v1/ai.ts");
      const app = new Hono();
      app.route("/conversations", aiRoutes);

      const res = await app.request("/conversations/1/suggest-reply", { method: "POST" });
      expect(res.status).toBe(401);
    });

    it("POST /auto-reply returns 401 unauthenticated without token", async () => {
      const { aiRoutes } = await import("../../src/routes/api/v1/ai.ts");
      const app = new Hono();
      app.route("/conversations", aiRoutes);

      const res = await app.request("/conversations/1/auto-reply", { method: "POST" });
      expect(res.status).toBe(401);
    });
  });
});
