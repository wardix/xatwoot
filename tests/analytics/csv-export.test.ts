import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { generateConversationsCSV } from "../../src/db/queries/analyticsQueries.ts";

describe("Advanced Metrics & CSV Export (VS-ANALYTICS-001)", () => {
  describe("generateConversationsCSV query", () => {
    it("generates CSV content with header columns", async () => {
      const csv = await generateConversationsCSV(999999);
      expect(csv).toContain("Display ID,Status,Priority,Subject,Contact Name,Contact Email,Assignee,Created At,Updated At");
    });
  });

  describe("GET /api/v1/analytics/export/csv route", () => {
    it("returns 401 unauthenticated without JWT token", async () => {
      const { analyticsRoutes } = await import("../../src/routes/api/v1/analytics.ts");
      const app = new Hono();
      app.route("/analytics", analyticsRoutes);

      const res = await app.request("/analytics/export/csv");
      expect(res.status).toBe(401);
    });
  });
});
