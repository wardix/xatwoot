import { describe, it, expect } from "bun:test";
import {
  subscribeAccount,
  unsubscribeAccount,
  broadcastToAccount,
  isUserGloballyOnline,
  redisBus,
  REDIS_CHANNEL,
  type MinimalWS,
} from "../../src/lib/websocket.ts";

describe("WebSocket Scaling via Redis Pub/Sub (VS-INFRA-002)", () => {
  describe("Redis Pub/Sub Cluster Broadcasting", () => {
    it("broadcasts messages across instances via Redis channel", () => {
      let receivedMessage: string | null = null;

      const mockWs: MinimalWS = {
        send: (data) => {
          receivedMessage = typeof data === "string" ? data : new TextDecoder().decode(data);
        },
      };

      subscribeAccount(101, mockWs);

      broadcastToAccount(101, {
        event: "message_created",
        data: { id: 1, text: "Hello Redis PubSub" },
      });

      expect(receivedMessage).not.toBeNull();
      expect(receivedMessage!).toContain("Hello Redis PubSub");

      unsubscribeAccount(101, mockWs);
    });
  });

  describe("Global Presence & Online Connection State", () => {
    it("tracks user global online status when subscribing/unsubscribing", () => {
      const mockWs: MinimalWS = { send: () => {} };

      subscribeAccount(202, mockWs);
      expect(isUserGloballyOnline(202)).toBe(true);

      unsubscribeAccount(202, mockWs);
      expect(isUserGloballyOnline(202)).toBe(false);
    });
  });
});
