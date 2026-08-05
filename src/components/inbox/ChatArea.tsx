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

  // WebSocket — subscribe to live events
  const { isConnected } = useWebSocket({
    token: token ?? "",
    url: `${WS_HOST}/ws`,
    onMessage: (event, data) => {
      if (!selectedId) return;
      if (event === "message.created" && data?.conversation_id === selectedId) {
        appendMessage(selectedId, data as Message);
      } else if (event === "typing_start" && data?.conversation_id === selectedId) {
        const name = String(data.user_name ?? data.user_id ?? "Agent");
        setTyping(selectedId, [...new Set([...typingUsers, name])]);
      } else if (event === "typing_stop" && data?.conversation_id === selectedId) {
        const name = String(data.user_name ?? data.user_id ?? "Agent");
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
        body: JSON.stringify({ body, sender_type: "user", sender_id: user?.id }),
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
              className={`message message--${msg.sender_type === "user" ? "agent" : msg.sender_type === "bot" ? "bot" : "contact"}`}
            >
              <div className="message__bubble">
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
          className="chat-area__ai-btn"
          onClick={handleSuggestReply}
          disabled={isSuggesting}
          title="Generate AI reply suggestion"
        >
          {isSuggesting ? "✨ Thinking..." : "✨ Suggest Reply"}
        </button>
        <input
          className="chat-area__input"
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Type your reply…"
          autoComplete="off"
        />
        <button className="chat-area__send-btn" type="submit" disabled={!input.trim()}>
          Send ↑
        </button>
      </form>
    </div>
  );
}
