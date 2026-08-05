import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { createSLAPolicy, checkAndEscalateSLABreaches } from "../../src/db/queries/slaQueries.ts";

describe("SLA Management & Auto-Escalation (VS-CORE-003)", () => {
  describe("SLA Policy CRUD & Breach Escalation Engine", () => {
    it("createSLAPolicy creates a policy and checkAndEscalateSLABreaches runs check", async () => {
      const policyName = `VIP SLA ${Date.now()}`;
      const policy = await createSLAPolicy({
        accountId: 1,
        name: policyName,
        frtMinutes: 1,
        artMinutes: 10,
        priority: "urgent",
      });

      expect(policy).toBeDefined();
      expect(policy.name).toBe(policyName);
      expect(policy.first_response_time_threshold_minutes).toBe(1);

      const res = await checkAndEscalateSLABreaches(1);
      expect(res).toBeDefined();
      expect(typeof res.checkedCount).toBe("number");
    });
  });

  describe("SLA REST API Endpoints", () => {
    it("GET /api/v1/sla/policies returns 401 unauthenticated without JWT token", async () => {
      const { slaRoutes } = await import("../../src/routes/api/v1/sla.ts");
      const app = new Hono();
      app.route("/sla", slaRoutes);

      const res = await app.request("/sla/policies");
      expect(res.status).toBe(401);
    });

    it("POST /api/v1/sla/check-breaches returns 401 unauthenticated without JWT token", async () => {
      const { slaRoutes } = await import("../../src/routes/api/v1/sla.ts");
      const app = new Hono();
      app.route("/sla", slaRoutes);

      const res = await app.request("/sla/check-breaches", { method: "POST" });
      expect(res.status).toBe(401);
    });
  });
});
