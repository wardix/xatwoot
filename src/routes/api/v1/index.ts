import { Hono } from "hono";
import { accountRoutes } from "./accounts.ts";
import { authRoutes } from "./auth.ts";
import { inboxRoutes } from "./inboxes.ts";

const v1Routes = new Hono();

v1Routes.route("/accounts", accountRoutes);
v1Routes.route("/auth", authRoutes);
v1Routes.route("/inboxes", inboxRoutes);

export { v1Routes };
