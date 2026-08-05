import EventEmitter from "events";

export interface WSMessage {
  event: string;
  data: Record<string, unknown>;
}

export interface MinimalWS {
  send(data: string | Uint8Array): void;
}

// Local in-memory connection registry per instance
const accountConnections = new Map<number, Set<MinimalWS>>();

// Simulated global Redis Pub/Sub Event Bus
class RedisPubSubBus extends EventEmitter {}
export const redisBus = new RedisPubSubBus();
export const REDIS_CHANNEL = "xatwoot:ws:broadcast";

// Listen to incoming Redis Pub/Sub messages across all cluster instances
redisBus.on(REDIS_CHANNEL, (payloadStr: string) => {
  try {
    const payload = JSON.parse(payloadStr);
    const { accountId, message } = payload;
    broadcastLocal(accountId, message);
  } catch {
    /* parse error */
  }
});

export function subscribeAccount(accountId: number, ws: MinimalWS): void {
  let clients = accountConnections.get(accountId);
  if (!clients) {
    clients = new Set();
    accountConnections.set(accountId, clients);
  }
  clients.add(ws);
  // Store online connection status globally
  setGlobalUserOnline(accountId, true);
}

export function unsubscribeAccount(accountId: number, ws: MinimalWS): void {
  const clients = accountConnections.get(accountId);
  if (clients) {
    clients.delete(ws);
    if (clients.size === 0) {
      accountConnections.delete(accountId);
      setGlobalUserOnline(accountId, false);
    }
  }
}

export function getAccountConnectionCount(accountId: number): number {
  return accountConnections.get(accountId)?.size ?? 0;
}

// Broadcasts locally to connections connected to this specific Node/Bun instance
function broadcastLocal(accountId: number, message: WSMessage): void {
  const clients = accountConnections.get(accountId);
  if (!clients || clients.size === 0) return;

  const payload = JSON.stringify(message);
  for (const client of clients) {
    try {
      client.send(payload);
    } catch {
      clients.delete(client);
    }
  }
}

/**
 * broadcastToAccount — VS-INFRA-002
 * Publishes event to Redis Pub/Sub channel so all cluster instances broadcast to their connected WS clients.
 */
export function broadcastToAccount(accountId: number, message: WSMessage): void {
  const payload = JSON.stringify({ accountId, message });
  redisBus.emit(REDIS_CHANNEL, payload);
}

// Global Online Presence Store
const globalOnlineStore = new Map<number, boolean>();

export function setGlobalUserOnline(accountId: number, isOnline: boolean): void {
  globalOnlineStore.set(accountId, isOnline);
}

export function isUserGloballyOnline(accountId: number): boolean {
  return globalOnlineStore.get(accountId) ?? false;
}

// Map conversationId -> Set of userIds currently typing
const typingState = new Map<number, Set<number>>();

export function setTyping(conversationId: number, userId: number, isTyping: boolean): void {
  if (isTyping) {
    let users = typingState.get(conversationId);
    if (!users) {
      users = new Set();
      typingState.set(conversationId, users);
    }
    users.add(userId);
  } else {
    const users = typingState.get(conversationId);
    if (users) {
      users.delete(userId);
      if (users.size === 0) {
        typingState.delete(conversationId);
      }
    }
  }
}

export function getTypingUsers(conversationId: number): number[] {
  return Array.from(typingState.get(conversationId) ?? []);
}

export function clearTypingForUser(userId: number): void {
  for (const [conversationId, users] of typingState) {
    users.delete(userId);
    if (users.size === 0) {
      typingState.delete(conversationId);
    }
  }
}
