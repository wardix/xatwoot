import React from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore.ts";

export function AppLayout() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#f9fafb" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: "240px",
          backgroundColor: "#1f2937",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ padding: "20px", fontSize: "18px", fontWeight: "bold", borderBottom: "1px solid #374151" }}>
          💬 Xatwoot
        </div>
        <nav style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <Link
            to="/dashboard"
            style={navLinkStyle}
          >
            📊 Dashboard
          </Link>
          <Link
            to="/settings"
            style={navLinkStyle}
          >
            ⚙️ Settings
          </Link>
        </nav>
        <div style={{ padding: "16px", borderTop: "1px solid #374151", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "13px", color: "#9ca3af" }}>
            {user?.email}
          </div>
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: "#dc2626",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              padding: "8px 12px",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, overflowY: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}

const navLinkStyle: React.CSSProperties = {
  color: "#e5e7eb",
  textDecoration: "none",
  padding: "10px 12px",
  borderRadius: "6px",
  fontSize: "14px",
  fontWeight: 500,
};

export default AppLayout;
