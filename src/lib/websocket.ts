export interface WSMessage {
  event: string;
  data: Record<string, unknown>;
}

export interface MinimalWS {
  send(data: string | Uint8Array): void;
}

// Map account_id -> Set of connected WebSocket objects
const accountConnections = new Map<number, Set<MinimalWS>>();

export function subscribeAccount(accountId: number, ws: MinimalWS): void {
  let clients = accountConnections.get(accountId);
  if (!clients) {
    clients = new Set();
    accountConnections.set(accountId, clients);
  }
  clients.add(ws);
}

export function unsubscribeAccount(accountId: number, ws: MinimalWS): void {
  const clients = accountConnections.get(accountId);
  if (clients) {
    clients.delete(ws);
    if (clients.size === 0) {
      accountConnections.delete(accountId);
    }
  }
}

export function getAccountConnectionCount(accountId: number): number {
  return accountConnections.get(accountId)?.size ?? 0;
}

export function broadcastToAccount(accountId: number, message: WSMessage): void {
  const clients = accountConnections.get(accountId);
  if (!clients || clients.size === 0) return;

  const payload = JSON.stringify(message);
  for (const client of clients) {
    try {
      client.send(payload);
    } catch {
      // Remove dead connection
      clients.delete(client);
    }
  }
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
