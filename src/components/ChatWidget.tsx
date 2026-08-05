import React, { useState } from "react";
import { useWebSocket } from "../hooks/useWebSocket.ts";

export interface ChatWidgetProps {
  token: string;
  contactId: number;
  inboxId: number;
  apiHost?: string;
  title?: string;
}

export function ChatWidget({
  token,
  contactId,
  inboxId,
  apiHost = "http://localhost:3000",
  title = "Chat Support",
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ id?: number; body: string; sender_type: string }>>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<number | null>(null);

  const { isConnected, sendMessage } = useWebSocket({
    token,
    url: `${apiHost.replace(/^http/, "ws")}/ws`,
    onMessage: (event, data) => {
      if (event === "message.created" && data?.body) {
        setMessages((prev) => [...prev, { id: data.id, body: String(data.body), sender_type: String(data.sender_type) }]);
      }
    },
  });

  const toggleWidget = async () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (nextOpen && !conversationId) {
      try {
        const res = await fetch(`${apiHost}/api/v1/contacts/${contactId}/conversations/active?inbox_id=${inboxId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data: any = await res.json();
          setConversationId(data.id);

          const msgRes = await fetch(`${apiHost}/api/v1/conversations/${data.id}/messages`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (msgRes.ok) {
            const msgData: any = await msgRes.json();
            if (Array.isArray(msgData)) {
              setMessages(msgData);
            }
          }
        }
      } catch {
        // Failed to initialize conversation
      }
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !conversationId) return;

    const bodyText = input;
    setInput("");

    try {
      const res = await fetch(`${apiHost}/api/v1/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          body: bodyText,
          sender_type: "contact",
          sender_id: contactId,
        }),
      });

      if (res.ok) {
        const newMsg: any = await res.json();
        setMessages((prev) => [...prev, { id: newMsg.id, body: newMsg.body, sender_type: newMsg.sender_type }]);
        sendMessage("message.created", newMsg);
      }
    } catch {
      // Send error
    }
  };

  return (
    <div style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 9999, fontFamily: "sans-serif" }}>
      {isOpen ? (
        <div
          style={{
            width: "350px",
            height: "450px",
            backgroundColor: "#fff",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: "#1f93ff",
              color: "#fff",
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: "bold" }}>{title}</div>
              <div style={{ fontSize: "12px", opacity: 0.8 }}>
                {isConnected ? "🟢 Online" : "🔴 Connecting..."}
              </div>
            </div>
            <button
              onClick={toggleWidget}
              style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "18px" }}
            >
              ✕
            </button>
          </div>

          {/* Messages list */}
          <div style={{ flex: 1, padding: "12px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
            {messages.map((m, idx) => (
              <div
                key={m.id ?? idx}
                style={{
                  alignSelf: m.sender_type === "contact" ? "flex-end" : "flex-start",
                  backgroundColor: m.sender_type === "contact" ? "#1f93ff" : "#f1f3f5",
                  color: m.sender_type === "contact" ? "#fff" : "#333",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  maxWidth: "80%",
                  fontSize: "14px",
                }}
              >
                {m.body}
              </div>
            ))}
          </div>

          {/* Input form */}
          <form onSubmit={handleSend} style={{ display: "flex", padding: "8px", borderTop: "1px solid #eee" }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput((e.target as HTMLInputElement).value)}
              placeholder="Type your message..."
              style={{
                flex: 1,
                border: "1px solid #ccc",
                borderRadius: "4px",
                padding: "8px",
                fontSize: "14px",
              }}
            />
            <button
              type="submit"
              style={{
                marginLeft: "6px",
                backgroundColor: "#1f93ff",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                padding: "8px 14px",
                cursor: "pointer",
              }}
            >
              Send
            </button>
          </form>
        </div>
      ) : (
        /* Floating Chat Toggle Button */
        <button
          onClick={toggleWidget}
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "28px",
            backgroundColor: "#1f93ff",
            color: "#fff",
            border: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            cursor: "pointer",
            fontSize: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          💬
        </button>
      )}
    </div>
  );
}
