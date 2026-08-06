import React, { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore.ts";

const API_HOST = import.meta.env.VITE_API_HOST ?? "http://localhost:3000";

interface CannedResponse {
  id: number;
  shortcut: string;
  content: string;
}

export function CannedResponsesSettings() {
  const token = useAuthStore((s) => s.token);
  const [cannedList, setCannedList] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [shortcut, setShortcut] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCannedResponses();
  }, [token]);

  async function fetchCannedResponses() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_HOST}/api/v1/canned-responses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setCannedList(json.data ?? []);
      }
    } catch {
      /* fetch error */
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortcut.trim() || !content.trim() || !token) return;
    setSaving(true);
    try {
      const sc = shortcut.startsWith("/") ? shortcut.trim() : `/${shortcut.trim()}`;
      const res = await fetch(`${API_HOST}/api/v1/canned-responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ shortcut: sc, content: content.trim() }),
      });
      if (res.ok) {
        setShortcut("");
        setContent("");
        fetchCannedResponses();
      }
    } catch {
      /* create error */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    try {
      await fetch(`${API_HOST}/api/v1/canned-responses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCannedResponses();
    } catch {
      /* delete error */
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h3 style={{ margin: "0 0 8px", color: "#111827" }}>⚡ Canned Responses (Quick Replies)</h3>
      <p style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 20px" }}>
        Save time by configuring pre-written templates triggered by <code>/shortcut</code> commands in chat.
      </p>

      {/* Creation Form */}
      <form
        onSubmit={handleCreate}
        style={{
          backgroundColor: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: "14px", color: "#374151" }}>Add New Quick Reply Template</div>
        <input
          type="text"
          placeholder="Shortcut Command (e.g. /refund or /hours)"
          value={shortcut}
          onChange={(e) => setShortcut(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
          required
        />
        <textarea
          placeholder="Full Canned Response Content..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontFamily: "inherit" }}
          required
        />
        <button
          type="submit"
          disabled={saving}
          style={{
            alignSelf: "flex-start",
            backgroundColor: "#10b981",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {saving ? "Saving..." : "+ Add Quick Reply"}
        </button>
      </form>

      {/* Template List */}
      <div style={{ fontWeight: 600, fontSize: "15px", marginBottom: "12px" }}>Configured Canned Responses</div>
      {loading ? (
        <div style={{ color: "#6b7280" }}>Loading quick replies...</div>
      ) : cannedList.length === 0 ? (
        <div style={{ color: "#9ca3af", fontSize: "14px" }}>No canned responses created yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {cannedList.map((item) => (
            <div
              key={item.id}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span
                  style={{
                    fontWeight: 700,
                    color: "#2563eb",
                    backgroundColor: "#eff6ff",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "13px",
                  }}
                >
                  {item.shortcut}
                </span>
                <div style={{ fontSize: "13px", color: "#374151", marginTop: "4px" }}>{item.content}</div>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                style={{
                  backgroundColor: "#fee2e2",
                  color: "#ef4444",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
