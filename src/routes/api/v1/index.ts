import { Hono } from "hono";
import { accountRoutes } from "./accounts.ts";
import { authRoutes } from "./auth.ts";

const v1Routes = new Hono();

v1Routes.route("/accounts", accountRoutes);
v1Routes.route("/auth", authRoutes);

export { v1Routes };
