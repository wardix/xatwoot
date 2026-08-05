import { describe, it, expect } from "bun:test";
import {
  broadcastToAccount,
  subscribeAccount,
  unsubscribeAccount,
  getAccountConnectionCount,
  type WSMessage,
} from "../../src/lib/websocket.ts";

describe("WebSocket Account Broadcasting Manager", () => {
  it("subscribes and tracks connections per account", () => {
    const mockWs1: any = { send: () => {} };
    const mockWs2: any = { send: () => {} };

    subscribeAccount(100, mockWs1);
    subscribeAccount(100, mockWs2);

    expect(getAccountConnectionCount(100)).toBe(2);

    unsubscribeAccount(100, mockWs1);
    expect(getAccountConnectionCount(100)).toBe(1);

    unsubscribeAccount(100, mockWs2);
    expect(getAccountConnectionCount(100)).toBe(0);
  });

  it("broadcasts event to all active connections in account", () => {
    const received1: string[] = [];
    const received2: string[] = [];

    const mockWs1: any = {
      send: (msg: string) => received1.push(msg),
    };
    const mockWs2: any = {
      send: (msg: string) => received2.push(msg),
    };

    subscribeAccount(200, mockWs1);
    subscribeAccount(200, mockWs2);

    const payload: WSMessage = {
      event: "message.created",
      data: { id: 1, body: "Hello real-time" },
    };

    broadcastToAccount(200, payload);

    expect(received1.length).toBe(1);
    expect(received2.length).toBe(1);

    const parsed1 = JSON.parse(received1[0]!);
    expect(parsed1.event).toBe("message.created");
    expect(parsed1.data.body).toBe("Hello real-time");

    unsubscribeAccount(200, mockWs1);
    unsubscribeAccount(200, mockWs2);
  });

  it("does not cross-broadcast to different accounts", () => {
    const receivedAccount1: string[] = [];
    const receivedAccount2: string[] = [];

    const wsAcc1: any = { send: (msg: string) => receivedAccount1.push(msg) };
    const wsAcc2: any = { send: (msg: string) => receivedAccount2.push(msg) };

    subscribeAccount(1, wsAcc1);
    subscribeAccount(2, wsAcc2);

    broadcastToAccount(1, { event: "message.created", data: { text: "Account 1 only" } });

    expect(receivedAccount1.length).toBe(1);
    expect(receivedAccount2.length).toBe(0);

    unsubscribeAccount(1, wsAcc1);
    unsubscribeAccount(2, wsAcc2);
  });
});
