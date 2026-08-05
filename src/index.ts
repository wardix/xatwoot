import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { v1Routes } from "./routes/api/v1/index.ts";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors());

// Health check
app.get("/health", (c) => c.json({ status: "ok", service: "xatwoot" }));

import { swaggerUI } from "@hono/swagger-ui";
import { openApiSpec } from "./openapi/spec.ts";

// API Documentation
app.get("/api/docs/openapi.json", (c) => c.json(openApiSpec));
app.get("/api/docs", swaggerUI({ url: "/api/docs/openapi.json" }));

// API Routes
app.route("/api/v1", v1Routes);

// 404 handler
app.notFound((c) =>
  c.json({ error: "Not Found", message: "Route not found" }, 404)
);

// Global error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json(
    { error: "Internal Server Error", message: err.message },
    500
  );
});

const PORT = Number(process.env.PORT ?? 3000);
console.log(`🚀 Xatwoot server running on http://localhost:${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
