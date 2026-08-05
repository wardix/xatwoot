import React, { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore.ts";

const API_HOST = import.meta.env.VITE_API_HOST ?? "http://localhost:3000";

const AVAILABLE_PERMISSIONS = [
  { flag: "can_manage_roles", label: "Manage Roles & Permissions" },
  { flag: "can_delete_messages", label: "Delete Messages" },
  { flag: "can_manage_billing", label: "Manage Account Billing" },
  { flag: "can_view_all_inboxes", label: "View All Inboxes" },
  { flag: "can_export_analytics", label: "Export Analytics & CSV Reports" },
];

interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: string[];
}

export function RolesPermissionsSettings() {
  const token = useAuthStore((s) => s.token);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, [token]);

  async function fetchRoles() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_HOST}/api/v1/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRoles(data);
      }
    } catch {
      /* fetch failed */
    } finally {
      setLoading(false);
    }
  }

  const handleTogglePerm = (flag: string) => {
    if (selectedPermissions.includes(flag)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== flag));
    } else {
      setSelectedPermissions([...selectedPermissions, flag]);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim() || !token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_HOST}/api/v1/roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: roleName.trim(),
          description: roleDescription.trim(),
          permissions: selectedPermissions,
        }),
      });
      if (res.ok) {
        setRoleName("");
        setRoleDescription("");
        setSelectedPermissions([]);
        fetchRoles();
      }
    } catch {
      /* create failed */
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (id: number) => {
    if (!token) return;
    try {
      await fetch(`${API_HOST}/api/v1/roles/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRoles();
    } catch {
      /* delete failed */
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h3 style={{ margin: "0 0 8px", color: "#111827" }}>🛡️ Granular Roles & Permissions (RBAC)</h3>
      <p style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 20px" }}>
        Define custom team roles and assign fine-grained capabilities.
      </p>

      {/* Role Creation Form */}
      <form
        onSubmit={handleCreateRole}
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
        <div style={{ fontWeight: 600, fontSize: "14px", color: "#374151" }}>Create Custom Role</div>
        <input
          type="text"
          placeholder="Role Name (e.g., Billing Supervisor)"
          value={roleName}
          onChange={(e) => setRoleName(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
          required
        />
        <input
          type="text"
          placeholder="Role Description"
          value={roleDescription}
          onChange={(e) => setRoleDescription(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
        />

        <div style={{ fontWeight: 600, fontSize: "13px", color: "#4b5563", marginTop: "4px" }}>
          Select Capabilities & Permissions:
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px" }}>
          {AVAILABLE_PERMISSIONS.map((perm) => (
            <label
              key={perm.flag}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
                color: "#374151",
                cursor: "pointer",
                backgroundColor: "#fff",
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #e5e7eb",
              }}
            >
              <input
                type="checkbox"
                checked={selectedPermissions.includes(perm.flag)}
                onChange={() => handleTogglePerm(perm.flag)}
              />
              {perm.label}
            </label>
          ))}
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
            marginTop: "8px",
          }}
        >
          {saving ? "Saving..." : "+ Create Custom Role"}
        </button>
      </form>

      {/* Role List */}
      <div style={{ fontWeight: 600, fontSize: "15px", marginBottom: "12px" }}>Existing Custom Roles</div>
      {loading ? (
        <div style={{ color: "#6b7280" }}>Loading roles...</div>
      ) : roles.length === 0 ? (
        <div style={{ color: "#9ca3af", fontSize: "14px" }}>No custom roles created yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {roles.map((r) => (
            <div
              key={r.id}
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
                <div style={{ fontWeight: 600, color: "#111827" }}>{r.name}</div>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>{r.description}</div>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "6px" }}>
                  {r.permissions.map((p) => (
                    <span
                      key={p}
                      style={{
                        backgroundColor: "#eff6ff",
                        color: "#2563eb",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontSize: "11px",
                        fontWeight: 500,
                      }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => handleDeleteRole(r.id)}
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
