import React, { useEffect, useState } from "react";

export interface AnalyticsSummaryData {
  conversations: {
    total: number;
    open: number;
    resolved: number;
    pending: number;
    snoozed: number;
  };
  messages: {
    total: number;
  };
}

export interface AnalyticsDashboardProps {
  token: string;
  apiHost?: string;
}

export function AnalyticsDashboard({
  token,
  apiHost = "http://localhost:3000",
}: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchSummary() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiHost}/api/v1/analytics/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (active) setData(json);
        } else {
          if (active) setError("Failed to load analytics metrics");
        }
      } catch {
        if (active) setError("Network error loading analytics");
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchSummary();
    return () => {
      active = false;
    };
  }, [token, apiHost]);

  if (loading) {
    return (
      <div style={{ padding: "24px", color: "#6b7280", fontFamily: "sans-serif" }}>
        Loading dashboard metrics...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "24px", color: "#ef4444", fontFamily: "sans-serif" }}>
        {error ?? "No data available"}
      </div>
    );
  }

  const cards = [
    { title: "Total Conversations", value: data.conversations.total, color: "#3b82f6" },
    { title: "Open Conversations", value: data.conversations.open, color: "#10b981" },
    { title: "Pending Conversations", value: data.conversations.pending, color: "#f59e0b" },
    { title: "Resolved Conversations", value: data.conversations.resolved, color: "#6b7280" },
    { title: "Total Messages", value: data.messages.total, color: "#8b5cf6" },
  ];

  return (
    <div style={{ padding: "24px", fontFamily: "sans-serif" }}>
      <h2 style={{ margin: "0 0 16px", color: "#111827", fontSize: "20px" }}>
        Analytics Overview
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
        }}
      >
        {cards.map((card, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>
              {card.title}
            </div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: card.color }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
