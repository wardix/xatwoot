import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { submitCSATSurvey, getCSATSummary } from "../../src/db/queries/csatQueries.ts";

describe("CSAT Surveys & Feedback Engine (VS-ANALYTICS-002)", () => {
  describe("submitCSATSurvey & getCSATSummary queries", () => {
    it("submits CSAT survey rating and computes aggregated CSAT metrics", async () => {
      const { createInbox } = await import("../../src/db/queries/inboxQueries.ts");
      const { createContact } = await import("../../src/db/queries/contactQueries.ts");
      const { createConversation } = await import("../../src/db/queries/conversationQueries.ts");

      const inbox = await createInbox({ account_id: 1, name: `CSAT Inbox ${Date.now()}`, channel_type: "web_widget" });
      const contact = await createContact({ account_id: 1, name: "CSAT Visitor", email: `csat-${Date.now()}@test.com` });
      const conv = await createConversation({
        account_id: 1,
        inbox_id: inbox.id,
        contact_id: contact.id,
        subject: "CSAT Test Conversation",
      });

      const survey = await submitCSATSurvey({
        accountId: 1,
        conversationId: conv.id,
        rating: 5,
        comment: "Excellent support team!",
      });

      expect(survey).toBeDefined();
      expect(survey.rating).toBe(5);
      expect(survey.comment).toBe("Excellent support team!");

      const summary = await getCSATSummary(1);
      expect(summary.totalResponses).toBeGreaterThan(0);
      expect(summary.averageRating).toBeGreaterThan(0);
    });
  });

  describe("CSAT REST API Endpoints", () => {
    it("POST /api/v1/conversations/:id/csat submits survey response", async () => {
      const { createUser } = await import("../../src/db/queries/userQueries.ts");
      const user = await createUser({
        account_id: 1,
        email: `csat-agent-${Date.now()}@test.com`,
        password_hash: "hash",
        role: "agent",
      });

      const { createInbox } = await import("../../src/db/queries/inboxQueries.ts");
      const { createContact } = await import("../../src/db/queries/contactQueries.ts");
      const { createConversation } = await import("../../src/db/queries/conversationQueries.ts");

      const inbox = await createInbox({ account_id: 1, name: `CSAT Inbox ${Date.now()}`, channel_type: "web_widget" });
      const contact = await createContact({ account_id: 1, name: "CSAT Visitor API", email: `csat-api-${Date.now()}@test.com` });
      const conv = await createConversation({
        account_id: 1,
        inbox_id: inbox.id,
        contact_id: contact.id,
        subject: "API CSAT Test Conversation",
      });

      const { signToken } = await import("../../src/lib/jwt.ts");
      const token = signToken({ userId: user.id, accountId: 1, email: user.email, role: "agent" });

      const { conversationRoutes } = await import("../../src/routes/api/v1/conversations.ts");
      const app = new Hono();
      app.route("/conversations", conversationRoutes);

      const res = await app.request(`/conversations/${conv.id}/csat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating: 4, comment: "Very good" }),
      });

      expect(res.status).toBe(201);
      const json: any = await res.json();
      expect(json.rating).toBe(4);
    });

    it("GET /api/v1/conversations/csat/summary returns CSAT analytics summary", async () => {
      const { createUser } = await import("../../src/db/queries/userQueries.ts");
      const user = await createUser({
        account_id: 1,
        email: `csat-agent2-${Date.now()}@test.com`,
        password_hash: "hash",
        role: "agent",
      });

      const { signToken } = await import("../../src/lib/jwt.ts");
      const token = signToken({ userId: user.id, accountId: 1, email: user.email, role: "agent" });

      const { conversationRoutes } = await import("../../src/routes/api/v1/conversations.ts");
      const app = new Hono();
      app.route("/conversations", conversationRoutes);

      const res = await app.request("/conversations/csat/summary", {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.averageRating).toBeDefined();
    });
  });
});
