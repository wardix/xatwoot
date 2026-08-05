import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { $ZodError } from "zod/v4/core";
import { typingActionSchema } from "@/schemas/typingSchema.ts";
import { findConversationById } from "@/db/queries/conversationQueries.ts";
import { broadcastToAccount, setTyping, getTypingUsers } from "@/lib/websocket.ts";
import { authMiddleware } from "@/middleware/auth.ts";
import type { User } from "@/db/queries/userQueries.ts";

type TypingVariables = { user: User; userId: number; accountId: number };
const typingRoutes = new Hono<{ Variables: TypingVariables }>();

typingRoutes.use("*", authMiddleware);

function validationError(error: $ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_root";
    if (!details[key]) details[key] = [];
    details[key]!.push(issue.message);
  }
  return details;
}

// POST /api/v1/conversations/:id/typing
typingRoutes.post(
  "/",
  zValidator("json", typingActionSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        { error: "Validation Failed", details: validationError(result.error) },
        422
      );
    }
  }),
  async (c) => {
    const accountId = c.get("accountId");
    const userId = c.get("userId");
    const conversationIdStr = c.req.param("id");
    const conversationId = Number(conversationIdStr);

    if (!conversationId || isNaN(conversationId)) {
      return c.json({ error: "Not Found", message: "Conversation not found" }, 404);
    }

    const conversation = await findConversationById(conversationId, accountId);
    if (!conversation) {
      return c.json({ error: "Not Found", message: "Conversation not found" }, 404);
    }

    const { action } = c.req.valid("json");
    const isTyping = action === "start";
    const event = isTyping ? "typing_start" : "typing_stop";

    // Update in-memory typing state
    setTyping(conversationId, userId, isTyping);

    // Broadcast to all account WebSocket subscribers
    broadcastToAccount(accountId, {
      event,
      data: {
        conversation_id: conversationId,
        user_id: userId,
        typing_users: getTypingUsers(conversationId),
      },
    });

    return c.json(
      {
        event,
        conversation_id: conversationId,
        user_id: userId,
        typing_users: getTypingUsers(conversationId),
      },
      200
    );
  }
);

export { typingRoutes };
