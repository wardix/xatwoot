import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { parseMetaPayload } from "../../src/lib/webhookParsers.ts";

describe("WhatsApp Cloud API & Instagram DM Integration (VS-OMNICHANNEL-002)", () => {
  describe("Meta Webhook Payload Parsing", () => {
    it("parses WhatsApp Cloud API incoming message payload", () => {
      const waPayload = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: "628123456789",
                      id: "wamid.HBgLMTIzNDU2Nzg5",
                      text: { body: "Hello from WhatsApp Cloud API!" },
                    },
                  ],
                  contacts: [{ profile: { name: "WhatsApp Customer" } }],
                },
              },
            ],
          },
        ],
      };

      const parsed = parseMetaPayload(waPayload);
      expect(parsed).not.toBeNull();
      expect(parsed?.senderId).toBe("628123456789");
      expect(parsed?.senderName).toBe("WhatsApp Customer");
      expect(parsed?.body).toBe("Hello from WhatsApp Cloud API!");
    });

    it("parses Instagram Direct DM incoming message payload", () => {
      const igPayload = {
        entry: [
          {
            messaging: [
              {
                sender: { id: "ig_user_12345" },
                message: { mid: "m_ig_msg_99", text: "Hello from Instagram DM!" },
              },
            ],
          },
        ],
      };

      const parsed = parseMetaPayload(igPayload);
      expect(parsed).not.toBeNull();
      expect(parsed?.senderId).toBe("ig_user_12345");
      expect(parsed?.body).toBe("Hello from Instagram DM!");
    });
  });

  describe("Meta Webhook Verification Endpoint", () => {
    it("GET /api/v1/webhooks/meta responds with challenge when verify_token matches", async () => {
      const { webhookRoutes } = await import("../../src/routes/api/v1/webhooks.ts");
      const app = new Hono();
      app.route("/webhooks", webhookRoutes);

      const res = await app.request("/webhooks/meta?hub.mode=subscribe&hub.verify_token=xatwoot_meta_verify&hub.challenge=123456");
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe("123456");
    });
  });
});
