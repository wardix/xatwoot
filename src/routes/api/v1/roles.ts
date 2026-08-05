import { Hono } from "hono";
import { authMiddleware, requirePermission } from "@/middleware/auth.ts";
import {
  createCustomRole,
  listAccountRoles,
  deleteCustomRole,
} from "@/db/queries/rbacQueries.ts";
import type { User } from "@/db/queries/userQueries.ts";

type RbacVariables = { user: User; userId: number; accountId: number };
const rbacRoutes = new Hono<{ Variables: RbacVariables }>();

rbacRoutes.use("*", authMiddleware);

// GET /api/v1/roles — list custom roles
rbacRoutes.get("/", async (c) => {
  const accountId = c.get("accountId");
  const roles = await listAccountRoles(accountId);
  return c.json(roles, 200);
});

// POST /api/v1/roles — create custom role (requires can_manage_roles permission or admin)
rbacRoutes.post("/", requirePermission("can_manage_roles"), async (c) => {
  const accountId = c.get("accountId");
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.name || !Array.isArray(body.permissions)) {
    return c.json({ error: "name and permissions array are required" }, 422);
  }

  const role = await createCustomRole({
    accountId,
    name: body.name,
    description: body.description,
    permissions: body.permissions,
  });

  return c.json(role, 201);
});

// DELETE /api/v1/roles/:id — delete custom role
rbacRoutes.delete("/:id", requirePermission("can_manage_roles"), async (c) => {
  const accountId = c.get("accountId");
  const roleId = Number(c.req.param("id"));

  const deleted = await deleteCustomRole(roleId, accountId);
  if (!deleted) {
    return c.json({ error: "Role not found" }, 404);
  }
  return c.json({ status: "success" }, 200);
});

export { rbacRoutes };
