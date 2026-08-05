import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { evaluateAutomationRules } from "../../src/db/queries/automationQueries.ts";

describe("Workflow Automation Engine (VS-AUTOMATION-001)", () => {
  describe("evaluateAutomationRules engine function", () => {
    it("returns executedRulesCount and actionsTaken for non-matching context", async () => {
      const result = await evaluateAutomationRules({
        accountId: 999999,
        eventType: "conversation_created",
        context: { conversationId: 1, subject: "Test" },
      });
      expect(result).toBeDefined();
      expect(typeof result.executedRulesCount).toBe("number");
      expect(Array.isArray(result.actionsTaken)).toBe(true);
    });
  });

  describe("Automation REST API Routes", () => {
    it("GET /rules returns 401 unauthenticated without JWT", async () => {
      const { automationRoutes } = await import("../../src/routes/api/v1/automation.ts");
      const app = new Hono();
      app.route("/automation", automationRoutes);

      const res = await app.request("/automation/rules");
      expect(res.status).toBe(401);
    });

    it("POST /rules returns 401 unauthenticated without JWT", async () => {
      const { automationRoutes } = await import("../../src/routes/api/v1/automation.ts");
      const app = new Hono();
      app.route("/automation", automationRoutes);

      const res = await app.request("/automation/rules", { method: "POST" });
      expect(res.status).toBe(401);
    });
  });
});
