import React from "react";
import { useAuthStore } from "../store/useAuthStore.ts";
import { AccountBrandingSettings } from "../components/AccountBrandingSettings.tsx";
import { WorkflowAutomationSettings } from "../components/WorkflowAutomationSettings.tsx";
import { AppIntegrationsSettings } from "../components/AppIntegrationsSettings.tsx";
import { RolesPermissionsSettings } from "../components/RolesPermissionsSettings.tsx";
import { LanguageSelector } from "../components/LanguageSelector.tsx";
import { KnowledgeBaseSettings } from "../components/KnowledgeBaseSettings.tsx";
import { SLASettings } from "../components/SLASettings.tsx";
import { MetaOmnichannelSettings } from "../components/MetaOmnichannelSettings.tsx";

export function SettingsPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  return (
    <div style={{ padding: "24px", fontFamily: "sans-serif" }}>
      <h1 style={{ margin: "0 0 24px", fontSize: "24px", color: "#111827" }}>
        Account Settings
      </h1>

      {token && user?.account_id ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          <LanguageSelector />
          <MetaOmnichannelSettings />
          <SLASettings />
          <KnowledgeBaseSettings />
          <AccountBrandingSettings
            accountId={user.account_id}
            token={token}
            apiHost=""
          />
          <WorkflowAutomationSettings />
          <AppIntegrationsSettings />
          <RolesPermissionsSettings />
        </div>
      ) : (
        <div>Please log in to view account settings.</div>
      )}
    </div>
  );
}

export default SettingsPage;
