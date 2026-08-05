import { Hono } from "hono";
import { accountRoutes } from "./accounts.ts";
import { authRoutes } from "./auth.ts";
import { inboxRoutes } from "./inboxes.ts";
import { contactRoutes } from "./contacts.ts";
import { conversationRoutes } from "./conversations.ts";
import { messageRoutes } from "./messages.ts";
import { labelRoutes } from "./labels.ts";
import { widgetRoutes } from "./widget.ts";
import { attachmentRoutes } from "./attachments.ts";
import { teamRoutes } from "./teams.ts";
import { typingRoutes } from "./typing.ts";
import { offlineMessageRoutes } from "./offlineMessages.ts";
import { cannedResponseRoutes } from "./cannedResponses.ts";

const v1Routes = new Hono();

v1Routes.route("/accounts", accountRoutes);
v1Routes.route("/auth", authRoutes);
v1Routes.route("/inboxes", inboxRoutes);
v1Routes.route("/contacts", contactRoutes);
v1Routes.route("/contacts/:id/conversations", widgetRoutes);
v1Routes.route("/conversations", conversationRoutes);
v1Routes.route("/conversations", labelRoutes);
v1Routes.route("/conversations/:conversation_id/messages", messageRoutes);
v1Routes.route("/messages", messageRoutes);
v1Routes.route("/labels", labelRoutes);
v1Routes.route("/attachments", attachmentRoutes);
v1Routes.route("/teams", teamRoutes);
v1Routes.route("/conversations/:id/typing", typingRoutes);
v1Routes.route("/offline-messages", offlineMessageRoutes);
v1Routes.route("/canned-responses", cannedResponseRoutes);

export { v1Routes };
