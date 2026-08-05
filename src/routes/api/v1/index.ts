import { Hono } from "hono";
import { accountRoutes } from "./accounts.ts";

const v1Routes = new Hono();

v1Routes.route("/accounts", accountRoutes);

export { v1Routes };
