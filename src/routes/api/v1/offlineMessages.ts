import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { $ZodError } from "zod/v4/core";
import { createOfflineMessageSchema } from "@/schemas/offlineMessageSchema.ts";
import { findInboxByIdPublic } from "@/db/queries/inboxQueries.ts";
import {
  findContactByEmail,
  createContact,
} from "@/db/queries/contactQueries.ts";
import {
  createConversation,
  findConversationById,
} from "@/db/queries/conversationQueries.ts";
import { createMessage } from "@/db/queries/messageQueries.ts";
import db from "@/db/client.ts";

const offlineMessageRoutes = new Hono();

function validationError(error: $ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_root";
    if (!details[key]) details[key] = [];
    details[key]!.push(issue.message);
  }
  return details;
}

// POST /api/v1/offline-messages — public, no auth required
offlineMessageRoutes.post(
  "/",
  zValidator("json", createOfflineMessageSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        { error: "Validation Failed", details: validationError(result.error) },
        422
      );
    }
  }),
  async (c) => {
    const { inbox_id, name, email, message, subject } = c.req.valid("json");

    // Find inbox — inbox carries the account_id
    const inbox = await findInboxByIdPublic(inbox_id);
    if (!inbox) {
      return c.json({ error: "Not Found", message: "Inbox not found" }, 404);
    }
    const accountId = inbox.account_id;

    // Find or create contact
    let contact = await findContactByEmail(email, accountId);
    if (!contact) {
      contact = await createContact({ account_id: accountId, name, email });
    }

    // Find existing pending conversation for this contact in this inbox, or create one
    const existingRows = await db.unsafe(
      `SELECT id FROM conversations
       WHERE account_id = $1 AND contact_id = $2 AND inbox_id = $3 AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`,
      [accountId, contact.id, inbox_id]
    );

    let conversationId: number;
    if (existingRows.length > 0) {
      conversationId = Number((existingRows[0] as { id: string }).id);
    } else {
      const conv = await createConversation({
        account_id: accountId,
        inbox_id,
        contact_id: contact.id,
        status: "pending",
        subject: subject ?? `Offline message from ${name}`,
      });
      conversationId = conv.id;
    }

    // Store the message (sender_type = contact)
    const msg = await createMessage({
      account_id: accountId,
      conversation_id: conversationId,
      sender_type: "contact",
      sender_id: contact.id,
      body: message,
    });

    return c.json(
      {
        status: "pending",
        conversation_id: conversationId,
        contact_id: contact.id,
        message_id: msg.id,
        confirmation: "Your message has been received. We'll get back to you soon.",
      },
      201
    );
  }
);

export { offlineMessageRoutes };
