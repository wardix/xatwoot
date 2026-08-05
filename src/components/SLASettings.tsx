import React, { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore.ts";

const API_HOST = import.meta.env.VITE_API_HOST ?? "http://localhost:3000";

interface SLAPolicy {
  id: number;
  name: string;
  description?: string;
  first_response_time_threshold_minutes: number;
  resolution_time_threshold_minutes: number;
  priority: string;
}

export function SLASettings() {
  const token = useAuthStore((s) => s.token);
  const [policies, setPolicies] = useState<SLAPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [frtMinutes, setFrtMinutes] = useState(15);
  const [artMinutes, setArtMinutes] = useState(120);
  const [priority, setPriority] = useState("urgent");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  useEffect(() => {
    fetchPolicies();
  }, [token]);

  async function fetchPolicies() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_HOST}/api/v1/sla/policies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPolicies(data);
      }
    } catch {
      /* fetch failed */
    } finally {
      setLoading(false);
    }
  }

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_HOST}/api/v1/sla/policies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          first_response_time_threshold_minutes: frtMinutes,
          resolution_time_threshold_minutes: artMinutes,
          priority,
        }),
      });
      if (res.ok) {
        setName("");
        fetchPolicies();
      }
    } catch {
      /* create failed */
    } finally {
      setSaving(false);
    }
  };

  const handleRunBreachCheck = async () => {
    if (!token) return;
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await fetch(`${API_HOST}/api/v1/sla/check-breaches`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCheckResult(`Checked open tickets. Found and escalated ${data.breachedCount} SLA breaches.`);
      }
    } catch {
      setCheckResult("Error executing SLA breach check.");
    } finally {
      setChecking(false);
    }
  };

  const handleDeletePolicy = async (id: number) => {
    if (!token) return;
    try {
      await fetch(`${API_HOST}/api/v1/sla/policies/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPolicies();
    } catch {
      /* delete failed */
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <h3 style={{ margin: "0 0 4px", color: "#111827" }}>⏱️ SLA Management & Auto-Escalation</h3>
          <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>
            Define SLA thresholds and configure automatic breach escalations.
          </p>
        </div>
        <button
          onClick={handleRunBreachCheck}
          disabled={checking}
          style={{
            backgroundColor: "#ef4444",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {checking ? "Checking..." : "⚡ Run SLA Breach Worker"}
        </button>
      </div>

      {checkResult && (
        <div style={{ padding: "10px", backgroundColor: "#fef2f2", color: "#dc2626", borderRadius: "6px", marginBottom: "16px", fontSize: "13px" }}>
          {checkResult}
        </div>
      )}

      {/* SLA Policy Creation Form */}
      <form
        onSubmit={handleCreatePolicy}
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
        <div style={{ fontWeight: 600, fontSize: "14px", color: "#374151" }}>Create SLA Policy</div>
        <input
          type="text"
          placeholder="Policy Name (e.g., VIP Support SLA)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
          required
        />

        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px" }}>
            <span>First Response Time Threshold (Minutes)</span>
            <input
              type="number"
              value={frtMinutes}
              onChange={(e) => setFrtMinutes(Number(e.target.value))}
              style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", width: "120px" }}
              required
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px" }}>
            <span>Resolution Time Threshold (Minutes)</span>
            <input
              type="number"
              value={artMinutes}
              onChange={(e) => setArtMinutes(Number(e.target.value))}
              style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", width: "120px" }}
              required
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            alignSelf: "flex-start",
            backgroundColor: "#3b82f6",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            padding: "8px 16px",
            fontWeight: 600,
            cursor: "pointer",
            marginTop: "4px",
          }}
        >
          {saving ? "Saving..." : "+ Save Policy"}
        </button>
      </form>

      {/* Policy List */}
      <div style={{ fontWeight: 600, fontSize: "15px", marginBottom: "12px" }}>Active SLA Policies</div>
      {loading ? (
        <div style={{ color: "#6b7280" }}>Loading SLA policies...</div>
      ) : policies.length === 0 ? (
        <div style={{ color: "#9ca3af", fontSize: "14px" }}>No SLA policies configured.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {policies.map((p) => (
            <div
              key={p.id}
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
                <div style={{ fontWeight: 600, color: "#111827" }}>{p.name}</div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                  FRT Limit: <strong>{p.first_response_time_threshold_minutes}m</strong> · Resolution Limit: <strong>{p.resolution_time_threshold_minutes}m</strong>
                </div>
              </div>
              <button
                onClick={() => handleDeletePolicy(p.id)}
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
