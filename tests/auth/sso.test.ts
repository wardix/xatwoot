import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { findOrCreateSSOUser } from "../../src/db/queries/ssoQueries.ts";

describe("SSO & SAML Enterprise Authentication (VS-AUTH-001)", () => {
  describe("findOrCreateSSOUser query function", () => {
    it("creates or returns existing SSO user without requiring password", async () => {
      const email = `sso-test-${Date.now()}@corporate.com`;
      const user = await findOrCreateSSOUser({
        email,
        name: "Enterprise Agent",
        provider: "google",
        uid: "g_123456",
      });

      expect(user).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.provider).toBe("google");
      expect(user.password_hash).toBeDefined();
    });
  });

  describe("SSO REST API Endpoints", () => {
    it("POST /api/v1/auth/sso/google registers or logs in Google SSO user", async () => {
      const { authRoutes } = await import("../../src/routes/api/v1/auth.ts");
      const app = new Hono();
      app.route("/auth", authRoutes);

      const ssoEmail = `google-user-${Date.now()}@gmail.com`;
      const res = await app.request("/auth/sso/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: ssoEmail, name: "Google Test User" }),
      });

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.token).toBeDefined();
      expect(json.user.email).toBe(ssoEmail);
    });

    it("POST /api/v1/auth/sso/saml registers or logs in SAML enterprise user", async () => {
      const { authRoutes } = await import("../../src/routes/api/v1/auth.ts");
      const app = new Hono();
      app.route("/auth", authRoutes);

      const samlEmail = `saml-user-${Date.now()}@saml-corp.com`;
      const res = await app.request("/auth/sso/saml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: samlEmail, name: "SAML Test User" }),
      });

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.token).toBeDefined();
      expect(json.user.email).toBe(samlEmail);
    });
  });
});
