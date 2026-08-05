import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { $ZodError } from "zod/v4/core";
import { createInboxSchema, updateInboxSchema } from "@/schemas/inboxSchema.ts";
import {
  createInbox,
  listInboxesByAccount,
  findInboxById,
  updateInbox,
} from "@/db/queries/inboxQueries.ts";
import { authMiddleware } from "@/middleware/auth.ts";
import type { User } from "@/db/queries/userQueries.ts";

type InboxVariables = { user: User; userId: number; accountId: number };
const inboxRoutes = new Hono<{ Variables: InboxVariables }>();

// All inbox routes require authentication
inboxRoutes.use("*", authMiddleware);

function validationError(error: $ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_root";
    if (!details[key]) details[key] = [];
    details[key].push(issue.message);
  }
  return details;
}

// POST /api/v1/inboxes — create inbox
inboxRoutes.post(
  "/",
  zValidator("json", createInboxSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: "Validation Failed", details: validationError(result.error) }, 422);
    }
  }),
  async (c) => {
    const accountId = c.get("accountId");
    const body = c.req.valid("json");

    const inbox = await createInbox({ ...body, account_id: accountId });

    return c.json(inbox, 201);
  }
);

// GET /api/v1/inboxes — list inboxes for account
inboxRoutes.get("/", async (c) => {
  const accountId = c.get("accountId");
  const page = Math.max(1, Number(c.req.query("page") ?? 1));
  const perPage = 20;
  const offset = (page - 1) * perPage;

  const { data, total } = await listInboxesByAccount(accountId, perPage, offset);

  return c.json({ data, meta: { total, page, per_page: perPage } });
});

// GET /api/v1/inboxes/:id — get inbox by id
inboxRoutes.get("/:id", async (c) => {
  const accountId = c.get("accountId");
  const id = Number(c.req.param("id"));
  if (isNaN(id)) {
    return c.json({ error: "Not Found", message: "Inbox not found" }, 404);
  }

  const inbox = await findInboxById(id, accountId);
  if (!inbox) {
    return c.json({ error: "Not Found", message: "Inbox not found" }, 404);
  }

  return c.json(inbox);
});

// PUT /api/v1/inboxes/:id — update inbox
inboxRoutes.put(
  "/:id",
  zValidator("json", updateInboxSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: "Validation Failed", details: validationError(result.error) }, 422);
    }
  }),
  async (c) => {
    const accountId = c.get("accountId");
    const id = Number(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ error: "Not Found", message: "Inbox not found" }, 404);
    }

    const body = c.req.valid("json");
    const inbox = await updateInbox(id, accountId, body);
    if (!inbox) {
      return c.json({ error: "Not Found", message: "Inbox not found" }, 404);
    }

    return c.json(inbox);
  }
);

export { inboxRoutes };
