import { useState, useEffect, useRef, useCallback } from "react";

export interface UseWebSocketOptions {
  token: string;
  url?: string;
  onMessage?: (event: string, data: any) => void;
}

export function useWebSocket({ token, url = "ws://localhost:3000/ws", onMessage }: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<{ event: string; data: any } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token) return;

    const wsUrl = `${url}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed?.event) {
          setLastMessage(parsed);
          if (onMessage) {
            onMessage(parsed.event, parsed.data);
          }
        }
      } catch {
        // Handle non-JSON message
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [token, url, onMessage]);

  const sendMessage = useCallback((event: string, data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event, data }));
    }
  }, []);

  return { isConnected, lastMessage, sendMessage };
}
