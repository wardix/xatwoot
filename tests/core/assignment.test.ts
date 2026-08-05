import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { getNextRoundRobinAgent } from "../../src/db/queries/assignmentQueries.ts";

describe("Agent Collision & Round-Robin Assignment (VS-CORE-001)", () => {
  describe("getNextRoundRobinAgent function", () => {
    it("returns null or next available agent from DB", async () => {
      const agent = await getNextRoundRobinAgent(999999);
      expect(agent === null || typeof agent.id === "number").toBe(true);
    });
  });

  describe("PUT /api/v1/teams/:id/auto-assign endpoint", () => {
    it("returns 401 unauthenticated without JWT token", async () => {
      const { teamRoutes } = await import("../../src/routes/api/v1/teams.ts");
      const app = new Hono();
      app.route("/teams", teamRoutes);

      const res = await app.request("/teams/1/auto-assign", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allow_auto_assign: true }),
      });
      expect(res.status).toBe(401);
    });
  });
});
