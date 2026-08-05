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

// GET /api/v1/analytics/export/csv — export conversation history as CSV
analyticsRoutes.get("/export/csv", async (c) => {
  const accountId = c.get("accountId");
  const { generateConversationsCSV } = await import("@/db/queries/analyticsQueries.ts");
  const csv = await generateConversationsCSV(accountId);

  c.header("Content-Type", "text/csv; charset=utf-8");
  c.header("Content-Disposition", `attachment; filename="conversations-export-account-${accountId}.csv"`);
  return c.text(csv);
});

export { analyticsRoutes };
