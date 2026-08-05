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
        </div>
      </section>
    </div>
  );
}
