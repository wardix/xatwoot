import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { trackCustomerEvent, listCustomerEventsForContact } from "../../src/db/queries/trackingQueries.ts";

describe("Customer Journey Tracking (VS-CRM-001)", () => {
  describe("trackCustomerEvent & listCustomerEventsForContact queries", () => {
    it("tracks events and retrieves chronological timeline for contact", async () => {
      const { createContact } = await import("../../src/db/queries/contactQueries.ts");
      const contact = await createContact({
        account_id: 1,
        name: "Timeline Test Visitor",
        email: `timeline-${Date.now()}@test.com`,
      });

      const event = await trackCustomerEvent({
        accountId: 1,
        contactId: contact.id,
        eventType: "page_view",
        url: "https://example.com/checkout",
        metadata: { referrer: "google" },
      });

      expect(event).toBeDefined();
      expect(event.event_type).toBe("page_view");
      expect(event.url).toBe("https://example.com/checkout");

      const timeline = await listCustomerEventsForContact(contact.id, 1);
      expect(timeline.length).toBeGreaterThan(0);
      expect(timeline[0].event_type).toBe("page_view");
    });
  });

  describe("Tracking REST API Endpoints", () => {
    it("POST /api/v1/tracking/event records a public website event", async () => {
      const { createContact } = await import("../../src/db/queries/contactQueries.ts");
      const contact = await createContact({
        account_id: 1,
        name: "API Tracking Visitor",
        email: `api-track-${Date.now()}@test.com`,
      });

      const { trackingRoutes } = await import("../../src/routes/api/v1/tracking.ts");
      const app = new Hono();
      app.route("/tracking", trackingRoutes);

      const res = await app.request("/tracking/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: 1,
          contact_id: contact.id,
          event_type: "add_to_cart",
          url: "/cart",
        }),
      });

      expect(res.status).toBe(201);
      const json: any = await res.json();
      expect(json.event_type).toBe("add_to_cart");
    });

    it("GET /api/v1/tracking/contacts/:id/events returns 401 unauthenticated without JWT", async () => {
      const { crmTrackingRoutes } = await import("../../src/routes/api/v1/tracking.ts");
      const app = new Hono();
      app.route("/tracking", crmTrackingRoutes);

      const res = await app.request("/tracking/contacts/1/events");
      expect(res.status).toBe(401);
    });
  });
});
