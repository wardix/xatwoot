import type { Context, Next } from "hono";
import { createAuditLog } from "../db/queries/auditLogQueries.ts";

/**
 * Middleware that automatically records audit log entries for all mutating HTTP requests
 * (POST, PUT, PATCH, DELETE).
 */
export async function auditLoggerMiddleware(c: Context, next: Next) {
  const method = c.req.method.toUpperCase();
  await next();

  // Only log mutating requests (POST, PUT, PATCH, DELETE) that succeed or return standard responses
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    try {
      const user = c.get("user");
      const userId = c.get("userId") ?? user?.id ?? null;
      const accountId = c.get("accountId") ?? user?.account_id ?? null;
      const path = c.req.path;
      const action = `${method} ${path}`;

      // Asynchronously record audit log entry
      await createAuditLog({
        account_id: accountId ? Number(accountId) : null,
        user_id: userId ? Number(userId) : null,
        action,
        metadata: {
          status: c.res.status,
          url: c.req.url,
          user_agent: c.req.header("User-Agent") ?? null,
        },
      });
    } catch (err) {
      console.error("Failed to record audit log:", err);
    }
  }
}
