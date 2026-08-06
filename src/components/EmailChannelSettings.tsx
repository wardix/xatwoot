import React, { useState } from "react";
import { useAuthStore } from "../store/useAuthStore.ts";

const API_HOST = import.meta.env.VITE_API_HOST ?? "http://localhost:3000";

export function EmailChannelSettings() {
  const token = useAuthStore((s) => s.token);

  const [inboxName, setInboxName] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("993");
  const [imapUser, setImapUser] = useState("");
  const [imapPassword, setImapPassword] = useState("");

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleConnectEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inboxName.trim() || !imapHost.trim() || !smtpHost.trim() || !token) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`${API_HOST}/api/v1/inboxes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: inboxName.trim(),
          channel_type: "email",
          integration_config: {
            imap_host: imapHost.trim(),
            imap_port: Number(imapPort),
            imap_user: imapUser.trim(),
            imap_password: imapPassword,
            smtp_host: smtpHost.trim(),
            smtp_port: Number(smtpPort),
            smtp_user: smtpUser.trim(),
            smtp_password: smtpPassword,
          },
        }),
      });
      if (res.ok) {
        setStatusMsg("✅ Email channel (IMAP/SMTP) inbox connected successfully!");
        setInboxName("");
        setImapHost("");
        setImapUser("");
        setImapPassword("");
        setSmtpHost("");
        setSmtpUser("");
        setSmtpPassword("");
      }
    } catch {
      setStatusMsg("❌ Failed to connect Email channel.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h3 style={{ margin: "0 0 8px", color: "#111827" }}>📧 Email Channel Integration (IMAP / SMTP)</h3>
      <p style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 20px" }}>
        Convert incoming support emails into Xatwoot conversations and reply via SMTP.
      </p>

      {statusMsg && (
        <div style={{ padding: "10px", backgroundColor: "#f0fdf4", color: "#166534", borderRadius: "6px", marginBottom: "16px", fontSize: "13px" }}>
          {statusMsg}
        </div>
      )}

      <form
        onSubmit={handleConnectEmail}
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          maxWidth: "600px",
        }}
      >
        <input
          type="text"
          placeholder="Inbox Name (e.g. Support Email)"
          value={inboxName}
          onChange={(e) => setInboxName(e.target.value)}
          style={{ padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db" }}
          required
        />

        <div style={{ fontWeight: 600, fontSize: "14px", color: "#374151", marginTop: "8px" }}>📥 IMAP Configuration (Incoming Emails)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: "10px" }}>
          <input
            type="text"
            placeholder="IMAP Host (e.g. imap.gmail.com)"
            value={imapHost}
            onChange={(e) => setImapHost(e.target.value)}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
            required
          />
          <input
            type="number"
            placeholder="Port"
            value={imapPort}
            onChange={(e) => setImapPort(e.target.value)}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
            required
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <input
            type="text"
            placeholder="IMAP User / Email"
            value={imapUser}
            onChange={(e) => setImapUser(e.target.value)}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
          />
          <input
            type="password"
            placeholder="IMAP Password"
            value={imapPassword}
            onChange={(e) => setImapPassword(e.target.value)}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
          />
        </div>

        <div style={{ fontWeight: 600, fontSize: "14px", color: "#374151", marginTop: "8px" }}>📤 SMTP Configuration (Outbound Replies)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: "10px" }}>
          <input
            type="text"
            placeholder="SMTP Host (e.g. smtp.gmail.com)"
            value={smtpHost}
            onChange={(e) => setSmtpHost(e.target.value)}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
            required
          />
          <input
            type="number"
            placeholder="Port"
            value={smtpPort}
            onChange={(e) => setSmtpPort(e.target.value)}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
            required
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <input
            type="text"
            placeholder="SMTP User / Email"
            value={smtpUser}
            onChange={(e) => setSmtpUser(e.target.value)}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
          />
          <input
            type="password"
            placeholder="SMTP Password"
            value={smtpPassword}
            onChange={(e) => setSmtpPassword(e.target.value)}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            backgroundColor: "#3b82f6",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            padding: "10px 20px",
            fontWeight: 600,
            cursor: "pointer",
            alignSelf: "flex-start",
          }}
        >
          {saving ? "Connecting..." : "Connect Email Channel"}
        </button>
      </form>
    </div>
  );
}
