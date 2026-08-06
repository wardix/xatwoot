import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import {
  createLabel,
  listAccountLabels,
  attachLabelToConversation,
  listConversationLabels,
  updateConversationCustomAttributes,
} from "../../src/db/queries/labelQueries.ts";

describe("Conversation Labels & Custom Attributes (VS-CRM-002)", () => {
  describe("Label Queries & Custom Attributes", () => {
    it("creates colored label, attaches to conversation, and updates custom_attributes", async () => {
      const { createInbox } = await import("../../src/db/queries/inboxQueries.ts");
      const { createContact } = await import("../../src/db/queries/contactQueries.ts");
      const { createConversation } = await import("../../src/db/queries/conversationQueries.ts");

      const inbox = await createInbox({ account_id: 1, name: `Label Inbox ${Date.now()}`, channel_type: "web_widget" });
      const contact = await createContact({ account_id: 1, name: "Label Visitor", email: `label-${Date.now()}@test.com` });
      const conv = await createConversation({
        account_id: 1,
        inbox_id: inbox.id,
        contact_id: contact.id,
        subject: "Labeled Conversation",
      });

      const labelName = `VIP_${Date.now()}`;
      const label = await createLabel({ accountId: 1, name: labelName, color: "#ec4899" });

      expect(label).toBeDefined();
      expect(label.name).toBe(labelName);

      await attachLabelToConversation(conv.id, label.id);
      const convLabels = await listConversationLabels(conv.id);
      expect(convLabels.length).toBeGreaterThan(0);

      const attrs = await updateConversationCustomAttributes(conv.id, 1, {
        subscription_tier: "Enterprise Pro",
        order_id: "#ORD-998241",
      });

      expect(attrs.subscription_tier).toBe("Enterprise Pro");
    });
  });

  describe("Labels REST API Endpoints", () => {
    it("GET /api/v1/labels lists account labels", async () => {
      const { createUser } = await import("../../src/db/queries/userQueries.ts");
      const user = await createUser({
        account_id: 1,
        email: `label-agent-${Date.now()}@test.com`,
        password_hash: "hash",
        role: "agent",
      });

      const { signToken } = await import("../../src/lib/jwt.ts");
      const token = signToken({ userId: user.id, accountId: 1, email: user.email, role: "agent" });

      const { labelRoutes } = await import("../../src/routes/api/v1/labels.ts");
      const app = new Hono();
      app.route("/labels", labelRoutes);

      const res = await app.request("/labels", {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(Array.isArray(json)).toBe(true);
    });
  });
});
