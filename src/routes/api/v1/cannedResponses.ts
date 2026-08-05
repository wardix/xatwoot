import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { $ZodError } from "zod/v4/core";
import { authMiddleware } from "@/middleware/auth.ts";
import {
  createCannedResponseSchema,
} from "@/schemas/cannedResponseSchema.ts";
import {
  createCannedResponse,
  deleteCannedResponse,
  findCannedResponseByShortcut,
  listCannedResponses,
} from "@/db/queries/cannedResponseQueries.ts";
import type { User } from "@/db/queries/userQueries.ts";

type CannedVariables = { user: User; userId: number; accountId: number };
const cannedResponseRoutes = new Hono<{ Variables: CannedVariables }>();

cannedResponseRoutes.use("*", authMiddleware);

function validationError(error: $ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_root";
    if (!details[key]) details[key] = [];
    details[key]!.push(issue.message);
  }
  return details;
}

// GET /api/v1/canned-responses - List canned responses for account
cannedResponseRoutes.get("/", async (c) => {
  const accountId = c.get("accountId");
  const search = c.req.query("search");
  const page = Math.max(1, Number(c.req.query("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") ?? 50)));
  const offset = (page - 1) * limit;

  const result = await listCannedResponses(accountId, search, limit, offset);

  return c.json({
    data: result.data,
    meta: {
      total: result.total,
      page,
      limit,
    },
  });
});

// POST /api/v1/canned-responses - Create canned response
cannedResponseRoutes.post(
  "/",
  zValidator("json", createCannedResponseSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        { error: "Validation Failed", details: validationError(result.error) },
        422
      );
    }
  }),
  async (c) => {
    const accountId = c.get("accountId");
    const body = c.req.valid("json");

    const existing = await findCannedResponseByShortcut(body.shortcut, accountId);
    if (existing) {
      return c.json(
        {
          error: "Validation Failed",
          details: { shortcut: ["Shortcut already exists in account"] },
        },
        422
      );
    }

    const created = await createCannedResponse({
      account_id: accountId,
      shortcut: body.shortcut,
      content: body.content,
    });

    return c.json(created, 201);
  }
);

// DELETE /api/v1/canned-responses/:id - Delete canned response
cannedResponseRoutes.delete("/:id", async (c) => {
  const accountId = c.get("accountId");
  const id = Number(c.req.param("id"));

  if (isNaN(id)) {
    return c.json({ error: "Not Found", message: "Canned response not found" }, 404);
  }

  const success = await deleteCannedResponse(id, accountId);
  if (!success) {
    return c.json({ error: "Not Found", message: "Canned response not found" }, 404);
  }

  return c.json({ message: "Canned response deleted successfully" }, 200);
});

export { cannedResponseRoutes };
