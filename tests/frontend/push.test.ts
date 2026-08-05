import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { registerServiceWorker, requestNotificationPermission } from "../../src/lib/pushNotifications.ts";

describe("Browser Web Push Notifications (VS-FRONTEND-004)", () => {
  describe("pushNotifications library helper", () => {
    it("exports registerServiceWorker and requestNotificationPermission functions", () => {
      expect(typeof registerServiceWorker).toBe("function");
      expect(typeof requestNotificationPermission).toBe("function");
    });

    it("registerServiceWorker returns null in SSR environment without window", async () => {
      const reg = await registerServiceWorker();
      expect(reg).toBeNull();
    });

    it("requestNotificationPermission returns denied in SSR environment without window", async () => {
      const perm = await requestNotificationPermission();
      expect(perm).toBe("denied");
    });
  });

  describe("Push REST API Routes", () => {
    it("POST /subscriptions returns 401 unauthenticated without JWT", async () => {
      const { pushRoutes } = await import("../../src/routes/api/v1/push.ts");
      const app = new Hono();
      app.route("/push", pushRoutes);

      const res = await app.request("/push/subscriptions", { method: "POST" });
      expect(res.status).toBe(401);
    });

    it("GET /subscriptions returns 401 unauthenticated without JWT", async () => {
      const { pushRoutes } = await import("../../src/routes/api/v1/push.ts");
      const app = new Hono();
      app.route("/push", pushRoutes);

      const res = await app.request("/push/subscriptions");
      expect(res.status).toBe(401);
    });
  });
});
