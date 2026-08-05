import { describe, it, expect } from "bun:test";
import {
  broadcastToAccount,
  subscribeAccount,
  unsubscribeAccount,
  getAccountConnectionCount,
  setTyping,
  getTypingUsers,
  clearTypingForUser,
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

describe("Typing Indicator State Manager", () => {
  it("records a user as typing in a conversation", () => {
    setTyping(501, 1, true);
    const typists = getTypingUsers(501);
    expect(typists).toContain(1);
  });

  it("removes a user from typing when they stop", () => {
    setTyping(502, 2, true);
    expect(getTypingUsers(502)).toContain(2);
    setTyping(502, 2, false);
    expect(getTypingUsers(502)).not.toContain(2);
  });

  it("tracks multiple users typing in the same conversation", () => {
    setTyping(503, 10, true);
    setTyping(503, 11, true);
    const typists = getTypingUsers(503);
    expect(typists).toContain(10);
    expect(typists).toContain(11);
    expect(typists.length).toBe(2);
  });

  it("clears a user from all conversations via clearTypingForUser", () => {
    setTyping(601, 99, true);
    setTyping(602, 99, true);
    clearTypingForUser(99);
    expect(getTypingUsers(601)).not.toContain(99);
    expect(getTypingUsers(602)).not.toContain(99);
  });

  it("does not mix typing state across different conversations", () => {
    setTyping(701, 5, true);
    expect(getTypingUsers(702)).not.toContain(5);
    setTyping(701, 5, false);
  });
});
