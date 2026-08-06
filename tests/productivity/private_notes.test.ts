import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { createMessage } from "../../src/db/queries/messageQueries.ts";

describe("Private Notes & Agent Mentions (VS-PRODUCTIVITY-001)", () => {
  describe("createMessage query with private = true", () => {
    it("creates a private note message", async () => {
      const { createInbox } = await import("../../src/db/queries/inboxQueries.ts");
      const { createContact } = await import("../../src/db/queries/contactQueries.ts");
      const { createConversation } = await import("../../src/db/queries/conversationQueries.ts");

      const inbox = await createInbox({ account_id: 1, name: `Notes Inbox ${Date.now()}`, channel_type: "web_widget" });
      const contact = await createContact({ account_id: 1, name: "Notes Contact", email: `notes-${Date.now()}@test.com` });
      const conv = await createConversation({
        account_id: 1,
        inbox_id: inbox.id,
        contact_id: contact.id,
        subject: "Private Notes Conversation",
      });

      const message = await createMessage({
        account_id: 1,
        conversation_id: conv.id,
        sender_type: "user",
        sender_id: 1,
        body: "Internal note: Customer needs urgent refund approval @admin",
        private: true,
      });

      expect(message).toBeDefined();
      expect(message.private).toBe(true);
      expect(message.body).toContain("@admin");
    });
  });

  describe("POST /api/v1/conversations/:id/messages with private note flag", () => {
    it("creates private note via REST API with mention parsing", async () => {
      const { createUser } = await import("../../src/db/queries/userQueries.ts");
      const user = await createUser({
        account_id: 1,
        email: `note-agent-${Date.now()}@test.com`,
        password_hash: "hash",
        role: "agent",
      });

      const { createInbox } = await import("../../src/db/queries/inboxQueries.ts");
      const { createContact } = await import("../../src/db/queries/contactQueries.ts");
      const { createConversation } = await import("../../src/db/queries/conversationQueries.ts");

      const inbox = await createInbox({ account_id: 1, name: `API Inbox ${Date.now()}`, channel_type: "web_widget" });
      const contact = await createContact({ account_id: 1, name: "API Contact", email: `api-${Date.now()}@test.com` });
      const conv = await createConversation({
        account_id: 1,
        inbox_id: inbox.id,
        contact_id: contact.id,
        subject: "API Private Note Conv",
      });

      const { signToken } = await import("../../src/lib/jwt.ts");
      const token = signToken({ userId: user.id, accountId: 1, email: user.email, role: "agent" });

      const { messageRoutes } = await import("../../src/routes/api/v1/messages.ts");
      const app = new Hono();
      app.route("/conversations/:conversation_id/messages", messageRoutes);

      const res = await app.request(`/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          body: "Private Note: Checking logs with @support_lead",
          private: true,
        }),
      });

      expect(res.status).toBe(201);
      const json: any = await res.json();
      expect(json.private).toBe(true);
      expect(json.body).toContain("@support_lead");
    });
  });
});
