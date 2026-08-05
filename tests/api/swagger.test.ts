import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";
import { openApiSpec } from "../../src/openapi/spec.ts";

const app = new Hono();
app.get("/api/docs/openapi.json", (c) => c.json(openApiSpec));
app.get("/api/docs", swaggerUI({ url: "/api/docs/openapi.json" }));

describe("OpenAPI & Swagger Documentation (VS-API-001)", () => {
  it("serves valid OpenAPI 3.0 JSON specification", async () => {
    const res = await app.request("/api/docs/openapi.json");
    expect(res.status).toBe(200);
    const spec = await res.json();
    expect(spec.openapi).toBe("3.0.0");
    expect(spec.info.title).toContain("Xatwoot");
    expect(spec.paths["/api/v1/auth/login"]).toBeDefined();
    expect(spec.paths["/api/v1/conversations"]).toBeDefined();
  });

  it("renders Swagger UI HTML page at /api/docs", async () => {
    const res = await app.request("/api/docs");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("swagger-ui");
  });
});
