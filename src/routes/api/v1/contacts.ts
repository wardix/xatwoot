import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { $ZodError } from "zod/v4/core";
import { createContactSchema, updateContactSchema } from "@/schemas/contactSchema.ts";
import {
  type Contact,
  createContact,
  listContacts,
  findContactById,
  findContactByEmail,
  updateContact,
} from "@/db/queries/contactQueries.ts";
import { authMiddleware } from "@/middleware/auth.ts";
import type { User } from "@/db/queries/userQueries.ts";

type ContactVariables = { user: User; userId: number; accountId: number };
const contactRoutes = new Hono<{ Variables: ContactVariables }>();

contactRoutes.use("*", authMiddleware);

function validationError(error: $ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_root";
    if (!details[key]) details[key] = [];
    details[key].push(issue.message);
  }
  return details;
}

// POST /api/v1/contacts
contactRoutes.post(
  "/",
  zValidator("json", createContactSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: "Validation Failed", details: validationError(result.error) }, 422);
    }
  }),
  async (c) => {
    const accountId = c.get("accountId");
    const body = c.req.valid("json");

    // Check duplicate email within same account
    if (body.email) {
      const existing = await findContactByEmail(body.email, accountId);
      if (existing) {
        return c.json(
          { error: "Validation Failed", details: { email: ["Email already exists for this account"] } },
          422
        );
      }
    }

    const contact = await createContact({ ...body, account_id: accountId });
    return c.json(contact, 201);
  }
);

// GET /api/v1/contacts
contactRoutes.get("/", async (c) => {
  const accountId = c.get("accountId");
  const q = c.req.query("q");
  const page = Math.max(1, Number(c.req.query("page") ?? 1));
  const perPage = 20;
  const offset = (page - 1) * perPage;

  const { data, total } = await listContacts(accountId, { q, limit: perPage, offset });

  return c.json({ data, meta: { total, page, per_page: perPage } });
});

// GET /api/v1/contacts/:id
contactRoutes.get("/:id", async (c) => {
  const accountId = c.get("accountId");
  const id = Number(c.req.param("id"));
  if (isNaN(id)) {
    return c.json({ error: "Not Found", message: "Contact not found" }, 404);
  }

  const contact = await findContactById(id, accountId);
  if (!contact) {
    return c.json({ error: "Not Found", message: "Contact not found" }, 404);
  }

  return c.json(contact);
});

// PUT /api/v1/contacts/:id
contactRoutes.put(
  "/:id",
  zValidator("json", updateContactSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: "Validation Failed", details: validationError(result.error) }, 422);
    }
  }),
  async (c) => {
    const accountId = c.get("accountId");
    const id = Number(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ error: "Not Found", message: "Contact not found" }, 404);
    }

    const body = c.req.valid("json");
    const contact = await updateContact(id, accountId, body);
    if (!contact) {
      return c.json({ error: "Not Found", message: "Contact not found" }, 404);
    }

    return c.json(contact);
  }
);

export { contactRoutes };
