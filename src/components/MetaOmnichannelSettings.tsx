import React, { useState } from "react";
import { useAuthStore } from "../store/useAuthStore.ts";

const API_HOST = import.meta.env.VITE_API_HOST ?? "http://localhost:3000";

export function MetaOmnichannelSettings() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const [waName, setWaName] = useState("");
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waToken, setWaToken] = useState("");

  const [igName, setIgName] = useState("");
  const [igPageId, setIgPageId] = useState("");
  const [igToken, setIgToken] = useState("");

  const [savingWa, setSavingWa] = useState(false);
  const [savingIg, setSavingIg] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleConnectWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waName.trim() || !waPhoneId.trim() || !token) return;
    setSavingWa(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`${API_HOST}/api/v1/inboxes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: waName.trim(),
          channel_type: "meta_whatsapp",
          integration_config: {
            phone_number_id: waPhoneId.trim(),
            access_token: waToken.trim(),
          },
        }),
      });
      if (res.ok) {
        setStatusMsg("✅ WhatsApp Cloud API inbox created successfully!");
        setWaName("");
        setWaPhoneId("");
        setWaToken("");
      }
    } catch {
      setStatusMsg("❌ Failed to connect WhatsApp Cloud API.");
    } finally {
      setSavingWa(false);
    }
  };

  const handleConnectInstagram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!igName.trim() || !igPageId.trim() || !token) return;
    setSavingIg(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`${API_HOST}/api/v1/inboxes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: igName.trim(),
          channel_type: "instagram",
          integration_config: {
            page_id: igPageId.trim(),
            access_token: igToken.trim(),
          },
        }),
      });
      if (res.ok) {
        setStatusMsg("✅ Instagram Direct DM inbox created successfully!");
        setIgName("");
        setIgPageId("");
        setIgToken("");
      }
    } catch {
      setStatusMsg("❌ Failed to connect Instagram Direct.");
    } finally {
      setSavingIg(false);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h3 style={{ margin: "0 0 8px", color: "#111827" }}>📱 Meta Omnichannel Integrations</h3>
      <p style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 20px" }}>
        Connect WhatsApp Cloud API and Instagram Direct Messages into your Xatwoot agent inbox.
      </p>

      {statusMsg && (
        <div style={{ padding: "10px", backgroundColor: "#f0fdf4", color: "#166534", borderRadius: "6px", marginBottom: "16px", fontSize: "13px" }}>
          {statusMsg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
        {/* WhatsApp Cloud API Form */}
        <form
          onSubmit={handleConnectWhatsApp}
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: "15px", color: "#25d366" }}>🟢 WhatsApp Cloud API</div>
          <input
            type="text"
            placeholder="Inbox Name (e.g. Sales WhatsApp)"
            value={waName}
            onChange={(e) => setWaName(e.target.value)}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
            required
          />
          <input
            type="text"
            placeholder="Phone Number ID"
            value={waPhoneId}
            onChange={(e) => setWaPhoneId(e.target.value)}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
            required
          />
          <input
            type="password"
            placeholder="Meta Access Token"
            value={waToken}
            onChange={(e) => setWaToken(e.target.value)}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
          />
          <button
            type="submit"
            disabled={savingWa}
            style={{
              backgroundColor: "#25d366",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              padding: "8px 16px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {savingWa ? "Connecting..." : "Connect WhatsApp"}
          </button>
        </form>

        {/* Instagram Direct DM Form */}
        <form
          onSubmit={handleConnectInstagram}
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: "15px", color: "#e1306c" }}>📸 Instagram Direct Messages</div>
          <input
            type="text"
            placeholder="Inbox Name (e.g. Instagram Support)"
            value={igName}
            onChange={(e) => setIgName(e.target.value)}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
            required
          />
          <input
            type="text"
            placeholder="Instagram Page / Account ID"
            value={igPageId}
            onChange={(e) => setIgPageId(e.target.value)}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
            required
          />
          <input
            type="password"
            placeholder="Graph API Access Token"
            value={igToken}
            onChange={(e) => setIgToken(e.target.value)}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
          />
          <button
            type="submit"
            disabled={savingIg}
            style={{
              backgroundColor: "#e1306c",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              padding: "8px 16px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {savingIg ? "Connecting..." : "Connect Instagram"}
          </button>
        </form>
      </div>
    </div>
  );
}
