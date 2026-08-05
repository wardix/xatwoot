import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { createJiraTicketFromConversation } from "../../src/db/queries/integrationQueries.ts";

describe("Slack & Jira App Integrations (VS-INTEGRATION-001)", () => {
  describe("createJiraTicketFromConversation function", () => {
    it("returns issueKey and issueUrl for conversation ticket creation", async () => {
      const ticket = await createJiraTicketFromConversation({
        accountId: 999999,
        conversationId: 101,
        summary: "E2E Test Jira Issue",
        description: "Customer bug report",
      });

      expect(ticket).toBeDefined();
      expect(ticket.issueKey).toContain("101");
      expect(ticket.issueUrl).toContain("browse");
    });
  });

  describe("Integrations REST API Routes", () => {
    it("GET /integrations returns 401 unauthenticated without JWT token", async () => {
      const { integrationRoutes } = await import("../../src/routes/api/v1/integrations.ts");
      const app = new Hono();
      app.route("/integrations", integrationRoutes);

      const res = await app.request("/integrations");
      expect(res.status).toBe(401);
    });

    it("PUT /integrations returns 401 unauthenticated without JWT token", async () => {
      const { integrationRoutes } = await import("../../src/routes/api/v1/integrations.ts");
      const app = new Hono();
      app.route("/integrations", integrationRoutes);

      const res = await app.request("/integrations", { method: "PUT" });
      expect(res.status).toBe(401);
    });

    it("POST /integrations/jira/ticket returns 401 unauthenticated without JWT token", async () => {
      const { integrationRoutes } = await import("../../src/routes/api/v1/integrations.ts");
      const app = new Hono();
      app.route("/integrations", integrationRoutes);

      const res = await app.request("/integrations/jira/ticket", { method: "POST" });
      expect(res.status).toBe(401);
    });
  });
});
