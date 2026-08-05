import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { createCustomRole, checkUserPermission } from "../../src/db/queries/rbacQueries.ts";

describe("Granular Role-Based Access Control (VS-CORE-002)", () => {
  describe("checkUserPermission function", () => {
    it("admin role bypasses all permission checks and returns true", async () => {
      const { createUser } = await import("../../src/db/queries/userQueries.ts");
      const adminEmail = `admin-rbac-${Date.now()}@test.com`;
      const adminUser = await createUser({
        account_id: 1,
        email: adminEmail,
        password_hash: "hash",
        name: "RBAC Admin",
        role: "admin",
      });

      const allowed = await checkUserPermission(adminUser.id, 1, "can_manage_billing");
      expect(allowed).toBe(true);
    });
  });

  describe("Custom Role Queries", () => {
    it("createCustomRole creates a role with assigned permissions", async () => {
      const roleName = `Support Supervisor ${Date.now()}`;
      const role = await createCustomRole({
        accountId: 1,
        name: roleName,
        description: "Supervisor with message deletion capability",
        permissions: ["can_delete_messages", "can_view_all_inboxes"],
      });

      expect(role).toBeDefined();
      expect(role.name).toBe(roleName);
      expect(role.permissions).toContain("can_delete_messages");
    });
  });

  describe("Roles REST API Routes", () => {
    it("GET /roles returns 401 unauthenticated without JWT token", async () => {
      const { rbacRoutes } = await import("../../src/routes/api/v1/roles.ts");
      const app = new Hono();
      app.route("/roles", rbacRoutes);

      const res = await app.request("/roles");
      expect(res.status).toBe(401);
    });

    it("POST /roles returns 401 unauthenticated without JWT token", async () => {
      const { rbacRoutes } = await import("../../src/routes/api/v1/roles.ts");
      const app = new Hono();
      app.route("/roles", rbacRoutes);

      const res = await app.request("/roles", { method: "POST" });
      expect(res.status).toBe(401);
    });
  });
});
