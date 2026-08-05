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
