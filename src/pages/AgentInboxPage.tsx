import React from "react";
import { ConversationList } from "../components/inbox/ConversationList.tsx";
import { ChatArea } from "../components/inbox/ChatArea.tsx";
import { CrmPanel } from "../components/inbox/CrmPanel.tsx";

export function AgentInboxPage() {
  return (
    <div className="inbox-layout">
      {/* Column 1 — Conversation List */}
      <aside className="inbox-layout__conv-list">
        <ConversationList />
      </aside>

      {/* Column 2 — Chat Message Area */}
      <main className="inbox-layout__chat">
        <ChatArea />
      </main>

      {/* Column 3 — CRM / Visitor Details Panel */}
      <aside className="inbox-layout__crm">
        <CrmPanel />
      </aside>
    </div>
  );
}

export default AgentInboxPage;
