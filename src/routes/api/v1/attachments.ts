import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { $ZodError } from "zod/v4/core";
import { createAttachmentSchema } from "@/schemas/attachmentSchema.ts";
import { createAttachment } from "@/db/queries/attachmentQueries.ts";
import { authMiddleware } from "@/middleware/auth.ts";
import type { User } from "@/db/queries/userQueries.ts";

type AttachVariables = { user: User; userId: number; accountId: number };
const attachmentRoutes = new Hono<{ Variables: AttachVariables }>();

attachmentRoutes.use("*", authMiddleware);

function validationError(error: $ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_root";
    if (!details[key]) details[key] = [];
    details[key].push(issue.message);
  }
  return details;
}

// POST /api/v1/attachments — upload/register file attachment returning URL metadata
attachmentRoutes.post(
  "/",
  zValidator("json", createAttachmentSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: "Validation Failed", details: validationError(result.error) }, 422);
    }
  }),
  async (c) => {
    const accountId = c.get("accountId");
    const body = c.req.valid("json");

    const attachment = await createAttachment({
      ...body,
      account_id: accountId,
    });

    return c.json(attachment, 201);
  }
);

export { attachmentRoutes };
