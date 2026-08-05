import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  type Account,
  createAccount,
  findAccountByEmail,
  findAccountById,
  listAccounts,
} from "@/db/queries/accountQueries.ts";
import { createAccountSchema } from "@/schemas/accountSchema.ts";

const accountRoutes = new Hono();

// POST /api/v1/accounts - Create new account
accountRoutes.post(
  "/",
  zValidator("json", createAccountSchema, (result, c) => {
    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".") || "_root";
        if (!fieldErrors[key]) fieldErrors[key] = [];
        fieldErrors[key].push(issue.message);
      }
      return c.json({ error: "Validation Failed", details: fieldErrors }, 422);
    }
  }),
  async (c) => {
    const body = c.req.valid("json");

    const existing = await findAccountByEmail(body.email);
    if (existing) {
      return c.json(
        {
          error: "Validation Failed",
          details: { email: ["Email already in use"] },
        },
        422
      );
    }

    const account = await createAccount(body);

    return c.json(
      {
        id: account.id,
        name: account.name,
        email: account.email,
        phone_number: account.phone_number,
        domain: account.domain,
        support_email: account.support_email,
        locale: account.locale,
        settings: account.settings,
        limits: account.limits,
        created_at: account.created_at,
      },
      201
    );
  }
);

// GET /api/v1/accounts - List accounts
accountRoutes.get("/", async (c) => {
  const page = Math.max(1, Number(c.req.query("page") ?? 1));
  const perPage = 20;
  const offset = (page - 1) * perPage;

  const { data, total } = await listAccounts(perPage, offset);

  return c.json({
    data: data.map((a: Account) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      locale: a.locale,
      created_at: a.created_at,
    })),
    meta: { total, page, per_page: perPage },
  });
});

// GET /api/v1/accounts/:id - Get account by ID
accountRoutes.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) {
    return c.json({ error: "Not Found", message: "Account not found" }, 404);
  }

  const account = await findAccountById(id);
  if (!account) {
    return c.json({ error: "Not Found", message: "Account not found" }, 404);
  }

  return c.json({
    id: account.id,
    name: account.name,
    email: account.email,
    phone_number: account.phone_number,
    domain: account.domain,
    support_email: account.support_email,
    locale: account.locale,
    settings: account.settings,
    limits: account.limits,
    created_at: account.created_at,
    updated_at: account.updated_at,
  });
});

export { accountRoutes };
