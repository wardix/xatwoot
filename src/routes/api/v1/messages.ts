import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { $ZodError } from "zod/v4/core";
import { createMessageSchema } from "@/schemas/messageSchema.ts";
import {
  createMessage,
  listMessagesByConversation,
} from "@/db/queries/messageQueries.ts";
import { findConversationById } from "@/db/queries/conversationQueries.ts";
import { authMiddleware } from "@/middleware/auth.ts";
import type { User } from "@/db/queries/userQueries.ts";

type MsgVariables = { user: User; userId: number; accountId: number };
const messageRoutes = new Hono<{ Variables: MsgVariables }>();

messageRoutes.use("*", authMiddleware);

function validationError(error: $ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_root";
    if (!details[key]) details[key] = [];
    details[key].push(issue.message);
  }
  return details;
}

// POST /api/v1/conversations/:conversation_id/messages OR /api/v1/messages
messageRoutes.post(
  "/",
  zValidator("json", createMessageSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: "Validation Failed", details: validationError(result.error) }, 422);
    }
  }),
  async (c) => {
    const accountId = c.get("accountId");
    const userId = c.get("userId");
    const paramConvIdStr = c.req.param("conversation_id");
    const body = c.req.valid("json");

    const targetConvId = paramConvIdStr ? Number(paramConvIdStr) : body.conversation_id;

    if (!targetConvId || isNaN(targetConvId)) {
      return c.json(
        { error: "Validation Failed", details: { conversation_id: ["conversation_id is required"] } },
        422
      );
    }

    // Verify conversation exists and belongs to account
    const conversation = await findConversationById(targetConvId, accountId);
    if (!conversation) {
      return c.json({ error: "Not Found", message: "Conversation not found" }, 404);
    }

    // Default sender_id to userId if sender_type is user and sender_id not specified
    const sender_type = body.sender_type ?? "user";
    const sender_id = body.sender_id ?? (sender_type === "user" ? userId : conversation.contact_id);

    const message = await createMessage({
      ...body,
      account_id: accountId,
      conversation_id: targetConvId,
      sender_type,
      sender_id,
    });

    return c.json(message, 201);
  }
);

// GET /api/v1/conversations/:conversation_id/messages
messageRoutes.get("/", async (c) => {
  const accountId = c.get("accountId");
  const paramConvIdStr = c.req.param("conversation_id");
  const targetConvId = paramConvIdStr ? Number(paramConvIdStr) : undefined;

  if (!targetConvId || isNaN(targetConvId)) {
    return c.json({ error: "Not Found", message: "Conversation not found" }, 404);
  }

  // Verify conversation exists and belongs to account
  const conversation = await findConversationById(targetConvId, accountId);
  if (!conversation) {
    return c.json({ error: "Not Found", message: "Conversation not found" }, 404);
  }

  const messages = await listMessagesByConversation(targetConvId, accountId);
  return c.json(messages, 200);
});

export { messageRoutes };
