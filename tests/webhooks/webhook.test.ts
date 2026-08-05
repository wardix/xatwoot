import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { parseTwilioPayload, parseMetaPayload } from "../../src/lib/webhookParsers.ts";

// ── Parser unit tests ─────────────────────────────────────────────────────────

describe("Webhook Integrations (VS-OMNICHANNEL-001)", () => {
  describe("parseTwilioPayload", () => {
    it("parses a valid Twilio WhatsApp payload", () => {
      const raw = {
        From: "whatsapp:+15551234567",
        Body: "Hello from WhatsApp!",
        MessageSid: "SM_test_123",
      };
      const result = parseTwilioPayload(raw);
      expect(result).not.toBeNull();
      expect(result!.senderId).toBe("+15551234567");
      expect(result!.body).toBe("Hello from WhatsApp!");
      expect(result!.platformMessageId).toBe("SM_test_123");
    });

    it("strips whatsapp: prefix from sender ID", () => {
      const result = parseTwilioPayload({ From: "whatsapp:+447911123456", Body: "Hi" });
      expect(result!.senderId).toBe("+447911123456");
    });

    it("returns null when required fields are missing", () => {
      expect(parseTwilioPayload({})).toBeNull();
      expect(parseTwilioPayload({ From: "+1234" })).toBeNull();
      expect(parseTwilioPayload({ Body: "text" })).toBeNull();
    });
  });

  describe("parseMetaPayload", () => {
    it("parses a valid Meta Messenger payload", () => {
      const raw = {
        object: "page",
        entry: [
          {
            messaging: [
              {
                sender: { id: "9876543210" },
                message: { mid: "m_abc", text: "Hello from Messenger!" },
              },
            ],
          },
        ],
      };
      const result = parseMetaPayload(raw);
      expect(result).not.toBeNull();
      expect(result!.senderId).toBe("9876543210");
      expect(result!.body).toBe("Hello from Messenger!");
      expect(result!.platformMessageId).toBe("m_abc");
    });

    it("returns null when payload has no messaging events", () => {
      expect(parseMetaPayload({})).toBeNull();
      expect(parseMetaPayload({ entry: [] })).toBeNull();
    });

    it("returns null when message text is empty", () => {
      const raw = { entry: [{ messaging: [{ sender: { id: "123" }, message: {} }] }] };
      expect(parseMetaPayload(raw)).toBeNull();
    });
  });

  // ── Route integration tests (no DB required) ─────────────────────────────────

  describe("POST /api/v1/webhooks/:channel route", () => {
    it("returns 422 when account_id or inbox_id is missing", async () => {
      const { webhookRoutes } = await import("../../src/routes/api/v1/webhooks.ts");
      const app = new Hono();
      app.route("/webhooks", webhookRoutes);

      const res = await app.request("/webhooks/twilio", { method: "POST" });
      expect(res.status).toBe(422);
    });

    it("returns 404 for unsupported channel", async () => {
      const { webhookRoutes } = await import("../../src/routes/api/v1/webhooks.ts");
      const app = new Hono();
      app.route("/webhooks", webhookRoutes);

      const res = await app.request("/webhooks/telegram?account_id=1&inbox_id=1", { method: "POST" });
      expect(res.status).toBe(404);
    });

    it("GET /meta returns 403 for invalid verify token", async () => {
      const { webhookRoutes } = await import("../../src/routes/api/v1/webhooks.ts");
      const app = new Hono();
      app.route("/webhooks", webhookRoutes);

      const res = await app.request("/webhooks/meta?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc123");
      expect(res.status).toBe(403);
    });
  });
});
