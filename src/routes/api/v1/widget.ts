import { Hono } from "hono";
import { findContactById } from "@/db/queries/contactQueries.ts";
import {
  createConversation,
  listConversations,
  type Conversation,
} from "@/db/queries/conversationQueries.ts";
import { authMiddleware } from "@/middleware/auth.ts";
import type { User } from "@/db/queries/userQueries.ts";

type WidgetVariables = { user: User; userId: number; accountId: number };
const widgetRoutes = new Hono<{ Variables: WidgetVariables }>();

widgetRoutes.use("*", authMiddleware);

// GET /api/v1/contacts/:id/conversations/active?inbox_id=X — get or create visitor active conversation
widgetRoutes.get("/active", async (c) => {
  const accountId = c.get("accountId");
  const contactId = Number(c.req.param("id"));
  const inboxIdStr = c.req.query("inbox_id");

  if (isNaN(contactId)) {
    return c.json({ error: "Not Found", message: "Contact not found" }, 404);
  }

  // Verify contact exists
  const contact = await findContactById(contactId, accountId);
  if (!contact) {
    return c.json({ error: "Not Found", message: "Contact not found" }, 404);
  }

  const inbox_id = inboxIdStr ? Number(inboxIdStr) : undefined;

  // Search for open or pending conversation for this contact
  const existingList = await listConversations(accountId, {
    inbox_id,
    limit: 10,
  });

  const activeConv = existingList.data.find(
    (conv: Conversation) =>
      conv.contact_id === contactId &&
      (conv.status === "open" || conv.status === "pending")
  );

  if (activeConv) {
    return c.json(activeConv, 200);
  }

  // Create new active conversation if none exists
  const newConv = await createConversation({
    account_id: accountId,
    contact_id: contactId,
    inbox_id: inbox_id ?? 1,
    status: "open",
    subject: `Visitor Chat - ${contact.name ?? "Visitor"}`,
  });

  return c.json(newConv, 200);
});

export { widgetRoutes };
