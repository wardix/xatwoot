import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useInboxStore, type Conversation } from "../../store/useInboxStore.ts";
import { useAuthStore } from "../../store/useAuthStore.ts";

const API_HOST = import.meta.env.VITE_API_HOST ?? "http://localhost:3000";

function statusBadge(status: Conversation["status"]) {
  const colors: Record<string, string> = {
    open: "#10b981",
    pending: "#f59e0b",
    resolved: "#6b7280",
    snoozed: "#8b5cf6",
  };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "12px",
        fontSize: "11px",
        fontWeight: 600,
        backgroundColor: colors[status] + "22",
        color: colors[status],
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}

function priorityDot(priority: Conversation["priority"]) {
  const colors: Record<string, string> = {
    low: "#10b981",
    medium: "#f59e0b",
    high: "#ef4444",
    urgent: "#7c3aed",
  };
  return (
    <span
      style={{
        display: "inline-block",
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        backgroundColor: colors[priority] ?? "#6b7280",
        flexShrink: 0,
      }}
      title={priority}
    />
  );
}

export function ConversationList() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const selectedId = useInboxStore((s) => s.selectedConversationId);
  const setSelected = useInboxStore((s) => s.setSelectedConversation);
  const setConversations = useInboxStore((s) => s.setConversations);

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["conversations", user?.account_id],
    queryFn: async () => {
      const res = await fetch(`${API_HOST}/api/v1/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch conversations");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!token,
    refetchInterval: 15000,
    onSuccess: setConversations,
  } as any);

  return (
    <div className="conv-list">
      <div className="conv-list__header">
        <span className="conv-list__title">Conversations</span>
        <span className="conv-list__count">{conversations.length}</span>
      </div>

      {isLoading ? (
        <div className="conv-list__loading">
          <div className="spinner" />
          <span>Loading…</span>
        </div>
      ) : conversations.length === 0 ? (
        <div className="conv-list__empty">
          <span>✉️</span>
          <p>No conversations yet</p>
        </div>
      ) : (
        <ul className="conv-list__items">
          {conversations.map((conv) => (
            <li
              key={conv.id}
              className={`conv-item${selectedId === conv.id ? " conv-item--active" : ""}`}
              onClick={() => setSelected(conv.id)}
            >
              <div className="conv-item__top">
                <div className="conv-item__avatar">
                  {(conv.contact?.name ?? "?")[0].toUpperCase()}
                </div>
                <div className="conv-item__info">
                  <div className="conv-item__name">{conv.contact?.name ?? "Unknown"}</div>
                  <div className="conv-item__subject">
                    #{conv.display_id} · {conv.subject ?? "No subject"}
                  </div>
                </div>
                <div className="conv-item__meta">
                  {priorityDot(conv.priority)}
                  {(conv.unread_count ?? 0) > 0 && (
                    <span className="conv-item__badge">{conv.unread_count}</span>
                  )}
                </div>
              </div>
              <div className="conv-item__bottom">
                {statusBadge(conv.status)}
                <span className="conv-item__inbox">{conv.inbox?.name ?? ""}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
