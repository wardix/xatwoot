import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useInboxStore, type Message } from "../../store/useInboxStore.ts";
import { useAuthStore } from "../../store/useAuthStore.ts";
import { TypingIndicator } from "../TypingIndicator.tsx";
import { useWebSocket } from "../../hooks/useWebSocket.ts";

const API_HOST = import.meta.env.VITE_API_HOST ?? "http://localhost:3000";
const WS_HOST = API_HOST.replace(/^http/, "ws");

export function ChatArea() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const selectedId = useInboxStore((s) => s.selectedConversationId);
  const conversations = useInboxStore((s) => s.conversations);
  const storeMessages = useInboxStore((s) => (selectedId ? s.messages[selectedId] ?? [] : []));
  const appendMessage = useInboxStore((s) => s.appendMessage);
  const typingUsers = useInboxStore((s) => (selectedId ? s.typingUsers[selectedId] ?? [] : []));
  const setTyping = useInboxStore((s) => s.setTyping);

  const [input, setInput] = useState("");
  const [isTypingLocal, setIsTypingLocal] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  // React Query — fetch messages for selected conversation
  const { isLoading } = useQuery<Message[]>({
    queryKey: ["messages", selectedId],
    queryFn: async () => {
      const res = await fetch(`${API_HOST}/api/v1/conversations/${selectedId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      const msgs = Array.isArray(data) ? data : [];
      useInboxStore.getState().setMessages(selectedId!, msgs);
      return msgs;
    },
    enabled: !!token && !!selectedId,
  } as any);

  // Collision detection — warning if another agent is viewing/typing
  const collisionAgent = typingUsers.find((name) => name !== user?.name && name !== user?.email);

  // WebSocket — subscribe to live events
  const { isConnected } = useWebSocket({
    token: token ?? "",
    url: `${WS_HOST}/ws`,
    onMessage: (event, data) => {
      if (!selectedId) return;
      if (event === "message.created" && data?.conversation_id === selectedId) {
        appendMessage(selectedId, data as Message);
      } else if (event === "typing_start" && data?.conversation_id === selectedId) {
        const name = String(data.user_name ?? data.user_id ?? "Another Agent");
        setTyping(selectedId, [...new Set([...typingUsers, name])]);
      } else if (event === "typing_stop" && data?.conversation_id === selectedId) {
        const name = String(data.user_name ?? data.user_id ?? "Another Agent");
        setTyping(selectedId, typingUsers.filter((u) => u !== name));
      }
    },
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [storeMessages]);

  const sendTypingEvent = async (action: "start" | "stop") => {
    if (!selectedId || !token) return;
    try {
      await fetch(`${API_HOST}/api/v1/conversations/${selectedId}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      });
    } catch { /* best-effort */ }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.currentTarget.value);
    if (!isTypingLocal) {
      setIsTypingLocal(true);
      sendTypingEvent("start");
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setIsTypingLocal(false);
      sendTypingEvent("stop");
    }, 2000);
  };

  const [isPrivate, setIsPrivate] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedId || !token) return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (isTypingLocal) { setIsTypingLocal(false); sendTypingEvent("stop"); }

    const body = input.trim();
    setInput("");
    try {
      const res = await fetch(`${API_HOST}/api/v1/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body, sender_type: "user", sender_id: user?.id, private: isPrivate }),
      });
      if (res.ok) {
        const msg = await res.json();
        appendMessage(selectedId, msg);
      }
    } catch { /* send failed */ }
  };

  if (!selectedId) {
    return (
      <div className="chat-area chat-area--empty">
        <div className="chat-area__placeholder">
          <span className="chat-area__placeholder-icon">💬</span>
          <h3>Select a conversation</h3>
          <p>Choose a conversation from the list to start responding.</p>
        </div>
      </div>
    );
  }

  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleSuggestReply = async () => {
    if (!selectedId || !token) return;
    setIsSuggesting(true);
    try {
      const res = await fetch(`${API_HOST}/api/v1/conversations/${selectedId}/suggest-reply`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.suggestion) {
          setInput(data.suggestion);
        }
      }
    } catch {
      /* suggest failed */
    } finally {
      setIsSuggesting(false);
    }
  };

  return (
    <div className="chat-area">
      {/* Header */}
      <div className="chat-area__header">
        <div className="chat-area__header-info">
          <div className="chat-area__avatar">
            {(selectedConversation?.contact?.name ?? "?")[0].toUpperCase()}
          </div>
          <div>
            <div className="chat-area__contact-name">
              {selectedConversation?.contact?.name ?? "Unknown"}
            </div>
            <div className="chat-area__meta">
              #{selectedConversation?.display_id} ·{" "}
              {selectedConversation?.inbox?.name ?? "Inbox"} ·{" "}
              <span className={`status-dot status-dot--${selectedConversation?.status}`}>
                {selectedConversation?.status}
              </span>
            </div>
          </div>
        </div>
        <div className="chat-area__ws-status">
          <span className={`ws-indicator${isConnected ? " ws-indicator--online" : ""}`} />
          {isConnected ? "Live" : "Connecting…"}
        </div>
      </div>

      {/* Collision Warning Banner */}
      {collisionAgent && (
        <div className="chat-area__collision-banner">
          ⚠️ <strong>Agent Collision Warning:</strong> Agent {collisionAgent} is also viewing/typing in this conversation.
        </div>
      )}

      {/* Messages */}
      <div className="chat-area__messages">
        {isLoading ? (
          <div className="chat-area__loading">
            <div className="spinner" />
          </div>
        ) : storeMessages.length === 0 ? (
          <div className="chat-area__no-messages">No messages yet — start the conversation!</div>
        ) : (
          storeMessages.map((msg, idx) => (
            <div
              key={msg.id ?? idx}
              className={`message ${msg.private ? "message--private" : `message--${msg.sender_type === "user" ? "agent" : msg.sender_type === "bot" ? "bot" : "contact"}`}`}
            >
              <div className="message__bubble">
                {msg.private && <span className="message__private-tag">🔒 Private Note</span>}
                {msg.sender_type === "bot" && <span className="message__bot-tag">🤖 Bot</span>}
                {msg.body}
              </div>
              {msg.created_at && (
                <div className="message__time">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </div>
          ))
        )}
        <TypingIndicator typingUsers={typingUsers} />
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form className="chat-area__input-bar" onSubmit={handleSend}>
        <button
          type="button"
          onClick={() => setIsPrivate(!isPrivate)}
          style={{
            backgroundColor: isPrivate ? "#fef08a" : "#e5e7eb",
            color: isPrivate ? "#854d0e" : "#374151",
            border: isPrivate ? "1px solid #fde047" : "none",
            borderRadius: "6px",
            padding: "8px 12px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {isPrivate ? "🔒 Private Note" : "💬 Reply"}
        </button>
        <button
          type="button"
          className="chat-area__ai-btn"
          onClick={handleSuggestReply}
          disabled={isSuggesting}
          title="Generate AI reply suggestion"
        >
          {isSuggesting ? "✨ Thinking..." : "✨ Suggest Reply"}
        </button>
        <div style={{ flex: 1, position: "relative" }}>
          {input.startsWith("/") && (
            <div
              style={{
                position: "absolute",
                bottom: "100%",
                left: 0,
                right: 0,
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 -4px 12px rgba(0,0,0,0.1)",
                maxHeight: "160px",
                overflowY: "auto",
                zIndex: 10,
                marginBottom: "4px",
              }}
            >
              {[
                { shortcut: "/refund", content: "We offer a 30-day full money-back guarantee. Please provide your order ID." },
                { shortcut: "/hours", content: "Our customer support team is available Mon-Fri, 9am - 5pm EST." },
                { shortcut: "/pricing", content: "Check out our pricing tiers at https://xatwoot.com/pricing" },
              ]
                .filter((c) => c.shortcut.toLowerCase().includes(input.toLowerCase()))
                .map((item) => (
                  <div
                    key={item.shortcut}
                    onClick={() => setInput(item.content)}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      borderBottom: "1px solid #f3f4f6",
                      fontSize: "13px",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#eff6ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <span style={{ fontWeight: 700, color: "#2563eb", marginRight: "8px" }}>{item.shortcut}</span>
                    <span style={{ color: "#4b5563" }}>{item.content}</span>
                  </div>
                ))}
            </div>
          )}
          <input
            className="chat-area__input"
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder={isPrivate ? "Add a private note (type @agent to mention)..." : "Type / for quick replies or your reply…"}
            autoComplete="off"
            style={{ width: "100%" }}
          />
        </div>
        <button className="chat-area__send-btn" type="submit" disabled={!input.trim()}>
          {isPrivate ? "Add Note" : "Send ↑"}
        </button>
      </form>
    </div>
  );
}
