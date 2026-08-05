import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth.ts";
import { exportAccountData } from "@/db/queries/gdprQueries.ts";
import type { User } from "@/db/queries/userQueries.ts";

type GdprVariables = { user: User; userId: number; accountId: number };
const gdprRoutes = new Hono<{ Variables: GdprVariables }>();

gdprRoutes.use("*", authMiddleware);

// GET /api/v1/gdpr/export - Export full account data as JSON
gdprRoutes.get("/export", async (c) => {
  const accountId = c.get("accountId");
  const data = await exportAccountData(accountId);
  return c.json(data);
});

export { gdprRoutes };
