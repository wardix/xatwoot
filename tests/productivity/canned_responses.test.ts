import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { createCannedResponse, findCannedResponseByShortcut } from "../../src/db/queries/cannedResponseQueries.ts";

describe("Canned Responses - Quick Replies (VS-PRODUCTIVITY-002)", () => {
  describe("Canned Response Database Queries", () => {
    it("creates and retrieves canned response by shortcut", async () => {
      const shortcut = `/refund_${Date.now()}`;
      const canned = await createCannedResponse({
        account_id: 1,
        shortcut,
        content: "Please submit your order number for a full refund.",
      });

      expect(canned).toBeDefined();
      expect(canned.shortcut).toBe(shortcut);

      const found = await findCannedResponseByShortcut(shortcut, 1);
      expect(found).not.toBeNull();
      expect(found?.content).toContain("full refund");
    });
  });

  describe("Canned Response REST API Endpoints", () => {
    it("GET /api/v1/canned-responses lists quick replies", async () => {
      const { createUser } = await import("../../src/db/queries/userQueries.ts");
      const user = await createUser({
        account_id: 1,
        email: `canned-agent-${Date.now()}@test.com`,
        password_hash: "hash",
        role: "agent",
      });

      const { signToken } = await import("../../src/lib/jwt.ts");
      const token = signToken({ userId: user.id, accountId: 1, email: user.email, role: "agent" });

      const { cannedResponseRoutes } = await import("../../src/routes/api/v1/cannedResponses.ts");
      const app = new Hono();
      app.route("/canned-responses", cannedResponseRoutes);

      const res = await app.request("/canned-responses", {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.data).toBeDefined();
    });
  });
});
