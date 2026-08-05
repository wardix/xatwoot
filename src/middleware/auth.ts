import type { Context, Next } from "hono";
import { verifyToken } from "../lib/jwt.ts";
import { findUserById } from "../db/queries/userQueries.ts";

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized", message: "Missing or invalid Authorization header" }, 401);
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    const user = await findUserById(payload.userId);
    if (!user) {
      return c.json({ error: "Unauthorized", message: "User not found" }, 401);
    }
    // Attach user to context for downstream handlers
    c.set("user", user);
    c.set("userId", user.id);
    c.set("accountId", user.account_id);
    await next();
  } catch {
    return c.json({ error: "Unauthorized", message: "Invalid or expired token" }, 401);
  }
}

/**
 * requirePermission — VS-CORE-002 Middleware
 * Enforces that the logged in user possesses a specific permission flag.
 */
export function requirePermission(permission: string) {
  return async (c: Context, next: Next) => {
    const userId = c.get("userId");
    const accountId = c.get("accountId");
    if (!userId || !accountId) {
      return c.json({ error: "Unauthorized", message: "User context missing" }, 401);
    }
    const { checkUserPermission } = await import("@/db/queries/rbacQueries.ts");
    const allowed = await checkUserPermission(userId, accountId, permission);
    if (!allowed) {
      return c.json({ error: "Forbidden", message: `Missing required permission: ${permission}` }, 403);
    }
    await next();
  };
}
