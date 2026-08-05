import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth.ts";
import { listAuditLogs } from "@/db/queries/auditLogQueries.ts";
import type { User } from "@/db/queries/userQueries.ts";

type AuditVariables = { user: User; userId: number; accountId: number };
const auditLogRoutes = new Hono<{ Variables: AuditVariables }>();

auditLogRoutes.use("*", authMiddleware);

// GET /api/v1/audit-logs - List audit logs for the authenticated user's account
auditLogRoutes.get("/", async (c) => {
  const accountId = c.get("accountId");
  const page = Math.max(1, Number(c.req.query("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") ?? 50)));
  const offset = (page - 1) * limit;

  const result = await listAuditLogs(accountId, limit, offset);

  return c.json({
    data: result.data,
    meta: {
      total: result.total,
      page,
      limit,
    },
  });
});

export { auditLogRoutes };
