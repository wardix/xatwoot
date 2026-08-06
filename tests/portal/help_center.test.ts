import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { createKBArticle } from "../../src/db/queries/ragQueries.ts";

describe("Public Help Center Portal (VS-PORTAL-001)", () => {
  describe("GET /api/v1/helpcenter/:account_id REST API", () => {
    it("fetches articles for public Help Center portal with search support", async () => {
      await createKBArticle({
        accountId: 1,
        title: "How to reset password?",
        category: "Account Management",
        content: "Go to Settings > Security and click 'Reset Password'.",
        keywords: ["password", "reset"],
      });

      const { helpCenterRoutes } = await import("../../src/routes/api/v1/helpCenter.ts");
      const app = new Hono();
      app.route("/helpcenter", helpCenterRoutes);

      const res = await app.request("/helpcenter/1");
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.account_id).toBe(1);
      expect(Array.isArray(json.articles)).toBe(true);
      expect(json.articles.length).toBeGreaterThan(0);

      // Search query filter test
      const searchRes = await app.request("/helpcenter/1?search=password");
      expect(searchRes.status).toBe(200);
      const searchJson: any = await searchRes.json();
      expect(searchJson.articles.length).toBeGreaterThan(0);
    });
  });
});
