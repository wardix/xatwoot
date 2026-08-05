import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore.ts";

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <aside className="app-sidebar">
        <div className="app-sidebar__brand">💬 Xatwoot</div>
        <nav className="app-sidebar__nav">
          <NavLink
            to="/inbox"
            className={({ isActive }) => `nav-link${isActive ? " nav-link--active" : ""}`}
          >
            📥 Agent Inbox
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-link${isActive ? " nav-link--active" : ""}`}
          >
            📊 Dashboard
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-link${isActive ? " nav-link--active" : ""}`}
          >
            ⚙️ Settings
          </NavLink>
        </nav>
        <div className="app-sidebar__footer">
          <div className="app-sidebar__user-email" title={user?.email}>
            {user?.name ?? user?.email ?? "Agent"}
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            ← Logout
          </button>
        </div>
      </aside>

      {/* Main Content — offset by sidebar width */}
      <main style={{ flex: 1, marginLeft: "220px", overflow: "hidden" }}>
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
