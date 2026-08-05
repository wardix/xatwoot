import React, { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore.ts";

const API_HOST = import.meta.env.VITE_API_HOST ?? "http://localhost:3000";

interface Rule {
  id: number;
  name: string;
  description?: string;
  event_type: string;
  conditions: Array<{ field: string; operator: string; value: string }>;
  actions: Array<{ type: string; payload?: any }>;
  active: boolean;
}

export function WorkflowAutomationSettings() {
  const token = useAuthStore((s) => s.token);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state for creating a new macro rule
  const [name, setName] = useState("");
  const [field, setField] = useState("subject");
  const [operator, setOperator] = useState("contains");
  const [value, setValue] = useState("");
  const [actionType, setActionType] = useState("change_priority");
  const [actionValue, setActionValue] = useState("high");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRules();
  }, [token]);

  async function fetchRules() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_HOST}/api/v1/automation/rules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch {
      /* fetch failed */
    } finally {
      setLoading(false);
    }
  }

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !value.trim() || !token) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_HOST}/api/v1/automation/rules`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          event_type: "conversation_created",
          conditions: [{ field, operator, value: value.trim() }],
          actions: [
            {
              type: actionType,
              payload:
                actionType === "change_priority"
                  ? { priority: actionValue }
                  : { text: actionValue },
            },
          ],
        }),
      });
      if (res.ok) {
        setName("");
        setValue("");
        fetchRules();
      }
    } catch {
      /* create failed */
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!token) return;
    try {
      await fetch(`${API_HOST}/api/v1/automation/rules/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRules();
    } catch {
      /* delete failed */
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h3 style={{ margin: "0 0 8px", color: "#111827" }}>⚡ Workflow Automation Rules (Macros)</h3>
      <p style={{ color: "#6b7280", fontSize: "14px", margin: "0 0 20px" }}>
        Build 'If This Then That' rules to automate conversation routing and status updates.
      </p>

      {/* New Rule Builder Form */}
      <form
        onSubmit={handleCreateRule}
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
        <div style={{ fontWeight: 600, fontSize: "14px", color: "#374151" }}>Create New Rule</div>
        <input
          type="text"
          placeholder="Rule Name (e.g., Escalated VIP Tickets)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
          required
        />

        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", color: "#6b7280" }}>IF</span>
          <select
            value={field}
            onChange={(e) => setField(e.target.value)}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
          >
            <option value="subject">Subject</option>
            <option value="status">Status</option>
            <option value="priority">Priority</option>
            <option value="message_body">Message Body</option>
          </select>

          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
          >
            <option value="contains">Contains</option>
            <option value="equals">Equals</option>
            <option value="starts_with">Starts With</option>
          </select>

          <input
            type="text"
            placeholder="Value (e.g., urgent)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", flex: 1 }}
            required
          />
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: "#6b7280" }}>THEN</span>
          <select
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
            style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
          >
            <option value="change_priority">Change Priority</option>
            <option value="close_conversation">Close Conversation</option>
            <option value="send_canned_response">Send Canned Response</option>
          </select>

          {actionType === "change_priority" && (
            <select
              value={actionValue}
              onChange={(e) => setActionValue(e.target.value)}
              style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
            >
              <option value="high">Urgent / High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              marginLeft: "auto",
              backgroundColor: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "8px 16px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {saving ? "Saving..." : "+ Save Rule"}
          </button>
        </div>
      </form>

      {/* Rules List */}
      <div style={{ fontWeight: 600, fontSize: "15px", marginBottom: "12px" }}>Active Automation Rules</div>
      {loading ? (
        <div style={{ color: "#6b7280" }}>Loading rules...</div>
      ) : rules.length === 0 ? (
        <div style={{ color: "#9ca3af", fontSize: "14px" }}>No automation rules created yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {rules.map((rule) => (
            <div
              key={rule.id}
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
                <div style={{ fontWeight: 600, color: "#111827" }}>{rule.name}</div>
                <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>
                  IF {rule.conditions[0]?.field} {rule.conditions[0]?.operator} "{rule.conditions[0]?.value}" THEN {rule.actions[0]?.type}
                </div>
              </div>
              <button
                onClick={() => handleDeleteRule(rule.id)}
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
