import { Hono } from "hono";
import { authMiddleware } from "@/middleware/auth.ts";
import { getAnalyticsSummary } from "@/db/queries/analyticsQueries.ts";
import type { User } from "@/db/queries/userQueries.ts";

type AnalyticsVariables = { user: User; userId: number; accountId: number };
const analyticsRoutes = new Hono<{ Variables: AnalyticsVariables }>();

analyticsRoutes.use("*", authMiddleware);

// GET /api/v1/analytics/summary - Get summary metrics for account
analyticsRoutes.get("/summary", async (c) => {
  const accountId = c.get("accountId");
  const summary = await getAnalyticsSummary(accountId);
  return c.json(summary);
});

export { analyticsRoutes };
