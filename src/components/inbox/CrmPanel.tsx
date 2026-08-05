import React from "react";
import { useInboxStore } from "../../store/useInboxStore.ts";

export function CrmPanel() {
  const selectedId = useInboxStore((s) => s.selectedConversationId);
  const conversations = useInboxStore((s) => s.conversations);
  const conv = conversations.find((c) => c.id === selectedId);
  const contact = conv?.contact;

  if (!selectedId || !conv) {
    return (
      <div className="crm-panel crm-panel--empty">
        <p>Select a conversation to view visitor details.</p>
      </div>
    );
  }

  return (
    <div className="crm-panel">
      {/* Contact Info */}
      <section className="crm-section">
        <h4 className="crm-section__title">Visitor</h4>
        <div className="crm-avatar">
          <div className="crm-avatar__circle">
            {(contact?.name ?? "?")[0].toUpperCase()}
          </div>
          <div className="crm-avatar__info">
            <div className="crm-avatar__name">{contact?.name ?? "Unknown"}</div>
            <div className="crm-avatar__email">{contact?.email ?? "—"}</div>
          </div>
        </div>
        <dl className="crm-dl">
          <dt>Phone</dt>
          <dd>{contact?.phone_number ?? "—"}</dd>
          <dt>Contact ID</dt>
          <dd>#{contact?.id ?? "—"}</dd>
        </dl>
      </section>

      {/* Conversation Info */}
      <section className="crm-section">
        <h4 className="crm-section__title">Conversation</h4>
        <dl className="crm-dl">
          <dt>ID</dt>
          <dd>#{conv.display_id}</dd>
          <dt>Status</dt>
          <dd style={{ textTransform: "capitalize" }}>{conv.status}</dd>
          <dt>Priority</dt>
          <dd style={{ textTransform: "capitalize" }}>{conv.priority}</dd>
          <dt>Inbox</dt>
          <dd>{conv.inbox?.name ?? "—"}</dd>
          <dt>Assignee</dt>
          <dd>{conv.assignee?.name ?? conv.assignee?.email ?? "Unassigned"}</dd>
          <dt>Subject</dt>
          <dd>{conv.subject ?? "—"}</dd>
        </dl>
      </section>

      {/* Actions */}
      <section className="crm-section">
        <h4 className="crm-section__title">Quick Actions</h4>
        <div className="crm-actions">
          <button className="crm-btn crm-btn--resolve">✓ Resolve</button>
          <button className="crm-btn crm-btn--snooze">💤 Snooze</button>
          <button
            className="crm-btn"
            style={{ backgroundColor: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)" }}
            onClick={async () => {
              const summary = prompt("Jira Issue Summary:", conv.subject ?? "Support Ticket");
              if (!summary) return;
              try {
                const token = localStorage.getItem("xatwoot_token");
                const res = await fetch("http://localhost:3000/api/v1/integrations/jira/ticket", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ conversation_id: conv.id, summary }),
                });
                if (res.ok) {
                  const data = await res.json();
                  alert(`Jira Issue Created: ${data.issueKey}\n${data.issueUrl}`);
                }
              } catch {
                alert("Failed to create Jira issue.");
              }
            }}
          >
            📋 Create Jira Issue
          </button>
        </div>
      </section>

      {/* Customer Journey Timeline */}
      <section className="crm-section">
        <h4 className="crm-section__title">Customer Journey Timeline</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
          <div style={{ padding: "6px 8px", backgroundColor: "#f3f4f6", borderRadius: "4px" }}>
            <span style={{ fontWeight: 600, color: "#3b82f6" }}>PAGE_VIEW</span>
            <div style={{ color: "#6b7280", fontSize: "11px" }}>/pricing</div>
          </div>
          <div style={{ padding: "6px 8px", backgroundColor: "#f3f4f6", borderRadius: "4px" }}>
            <span style={{ fontWeight: 600, color: "#10b981" }}>ADD_TO_CART</span>
            <div style={{ color: "#6b7280", fontSize: "11px" }}>Plan: Pro Enterprise</div>
          </div>
          <div style={{ padding: "6px 8px", backgroundColor: "#f3f4f6", borderRadius: "4px" }}>
            <span style={{ fontWeight: 600, color: "#ef4444" }}>ERROR_ENCOUNTERED</span>
            <div style={{ color: "#6b7280", fontSize: "11px" }}>Payment Gateway Timeout</div>
          </div>
        </div>
      </section>
    </div>
  );
}
