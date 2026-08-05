import { Hono } from "hono";
import { accountRoutes } from "./accounts.ts";
import { authRoutes } from "./auth.ts";
import { inboxRoutes } from "./inboxes.ts";
import { contactRoutes } from "./contacts.ts";
import { conversationRoutes } from "./conversations.ts";

const v1Routes = new Hono();

v1Routes.route("/accounts", accountRoutes);
v1Routes.route("/auth", authRoutes);
v1Routes.route("/inboxes", inboxRoutes);
v1Routes.route("/contacts", contactRoutes);
v1Routes.route("/conversations", conversationRoutes);

export { v1Routes };
