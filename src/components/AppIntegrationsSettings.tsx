import React, { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore.ts";

const API_HOST = import.meta.env.VITE_API_HOST ?? "http://localhost:3000";

export function AppIntegrationsSettings() {
  const token = useAuthStore((s) => s.token);
  const [slackWebhook, setSlackWebhook] = useState("");
  const [slackChannel, setSlackChannel] = useState("#support-alerts");
  const [jiraDomain, setJiraDomain] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraToken, setJiraToken] = useState("");
  const [jiraProjectKey, setJiraProjectKey] = useState("SUP");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      if (!token) return;
      try {
        const res = await fetch(`${API_HOST}/api/v1/integrations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.slack_webhook_url) setSlackWebhook(data.slack_webhook_url);
          if (data.slack_channel) setSlackChannel(data.slack_channel);
          if (data.jira_domain) setJiraDomain(data.jira_domain);
          if (data.jira_email) setJiraEmail(data.jira_email);
          if (data.jira_api_token) setJiraToken(data.jira_api_token);
          if (data.jira_project_key) setJiraProjectKey(data.jira_project_key);
        }
      } catch {
        /* fetch failed */
      }
    }
    loadConfig();
  }, [token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setSavedMsg(false);
    try {
      const res = await fetch(`${API_HOST}/api/v1/integrations`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slack_webhook_url: slackWebhook,
          slack_channel: slackChannel,
          jira_domain: jiraDomain,
          jira_email: jiraEmail,
          jira_api_token: jiraToken,
          jira_project_key: jiraProjectKey,
        }),
      });
      if (res.ok) {
        setSavedMsg(true);
        setTimeout(() => setSavedMsg(false), 3000);
      }
    } catch {
      /* save failed */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h3 style={{ margin: "0 0 8px", color: "#111827" }}>🔗 App Integrations (Slack & Jira)</h3>
      <p style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 20px" }}>
        Connect Xatwoot with workplace tools to send high-priority Slack alerts and create Jira issues.
      </p>

      {savedMsg && (
        <div style={{ padding: "10px", backgroundColor: "#ecfdf5", color: "#047857", borderRadius: "6px", marginBottom: "16px", fontSize: "14px" }}>
          ✅ Integration settings saved successfully!
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Slack Section */}
        <div style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px" }}>
          <h4 style={{ margin: "0 0 12px", color: "#1f2937", display: "flex", alignItems: "center", gap: "6px" }}>
            💬 Slack Workplace Integration
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ fontSize: "13px", color: "#374151" }}>Slack Incoming Webhook URL</label>
            <input
              type="text"
              placeholder="https://hooks.slack.com/services/..."
              value={slackWebhook}
              onChange={(e) => setSlackWebhook(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
            />
            <label style={{ fontSize: "13px", color: "#374151" }}>Slack Channel</label>
            <input
              type="text"
              placeholder="#support-alerts"
              value={slackChannel}
              onChange={(e) => setSlackChannel(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
            />
          </div>
        </div>

        {/* Jira Section */}
        <div style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px" }}>
          <h4 style={{ margin: "0 0 12px", color: "#1f2937", display: "flex", alignItems: "center", gap: "6px" }}>
            📋 Atlassian Jira Software Integration
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <label style={{ fontSize: "13px", color: "#374151" }}>Jira Domain</label>
            <input
              type="text"
              placeholder="mycompany.atlassian.net"
              value={jiraDomain}
              onChange={(e) => setJiraDomain(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
            />
            <label style={{ fontSize: "13px", color: "#374151" }}>Jira Account Email</label>
            <input
              type="email"
              placeholder="admin@mycompany.com"
              value={jiraEmail}
              onChange={(e) => setJiraEmail(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
            />
            <label style={{ fontSize: "13px", color: "#374151" }}>Jira API Token</label>
            <input
              type="password"
              placeholder="ATATT3xFfGF0..."
              value={jiraToken}
              onChange={(e) => setJiraToken(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
            />
            <label style={{ fontSize: "13px", color: "#374151" }}>Jira Project Key</label>
            <input
              type="text"
              placeholder="SUP"
              value={jiraProjectKey}
              onChange={(e) => setJiraProjectKey(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", width: "120px" }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            alignSelf: "flex-start",
            backgroundColor: "#10b981",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {saving ? "Saving..." : "Save Integrations"}
        </button>
      </form>
    </div>
  );
}
