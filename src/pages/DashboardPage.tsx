import React from "react";
import { useAuthStore } from "../store/useAuthStore.ts";
import { AnalyticsDashboard } from "../components/AnalyticsDashboard.tsx";

export function DashboardPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  return (
    <div style={{ padding: "24px", fontFamily: "sans-serif" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "24px", color: "#111827" }}>
          Welcome back, {user?.name ?? user?.email ?? "Agent"}!
        </h1>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
          Overview of conversations, messages, and team performance.
        </p>
      </div>

      {token ? (
        <AnalyticsDashboard token={token} apiHost="" />
      ) : (
        <div>Please log in to view analytics dashboard.</div>
      )}
    </div>
  );
}

export default DashboardPage;
