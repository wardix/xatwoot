import React, { useState, useEffect } from "react";

export interface CannedResponseItem {
  id: number;
  shortcut: string;
  content: string;
}

export interface CannedResponsePickerProps {
  /** Auth token for API requests */
  token: string;
  /** API Host */
  apiHost?: string;
  /** Callback when user selects a response */
  onSelect: (content: string) => void;
  /** Optional filter trigger text (e.g., slash command filter) */
  filterText?: string;
  /** Callback to close picker */
  onClose?: () => void;
}

/**
 * CannedResponsePicker — UI popup to search & select canned responses.
 */
export function CannedResponsePicker({
  token,
  apiHost = "http://localhost:3000",
  onSelect,
  filterText = "",
  onClose,
}: CannedResponsePickerProps) {
  const [responses, setResponses] = useState<CannedResponseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(filterText);

  useEffect(() => {
    let active = true;
    async function fetchResponses() {
      setLoading(true);
      try {
        const query = search ? `?search=${encodeURIComponent(search)}` : "";
        const res = await fetch(`${apiHost}/api/v1/canned-responses${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data: any = await res.json();
          if (active && Array.isArray(data.data)) {
            setResponses(data.data);
          }
        }
      } catch {
        // Fetch error handling
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchResponses();
    return () => {
      active = false;
    };
  }, [token, apiHost, search]);

  return (
    <div
      role="dialog"
      aria-label="Canned Responses Picker"
      style={{
        position: "absolute",
        bottom: "100%",
        left: 0,
        right: 0,
        marginBottom: "8px",
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        maxHeight: "240px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 100,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          padding: "8px",
          borderBottom: "1px solid #f3f4f6",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          placeholder="Search canned responses..."
          autoFocus
          style={{
            flex: 1,
            border: "1px solid #d1d5db",
            borderRadius: "4px",
            padding: "6px 10px",
            fontSize: "13px",
            outline: "none",
          }}
        />
        {onClose && (
          <button
            onClick={onClose}
            type="button"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#6b7280",
              fontSize: "16px",
            }}
          >
            ✕
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {loading ? (
          <div style={{ padding: "12px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
            Loading responses...
          </div>
        ) : responses.length === 0 ? (
          <div style={{ padding: "12px", textAlign: "center", color: "#9ca3af", fontSize: "13px" }}>
            No canned responses found
          </div>
        ) : (
          responses.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.content)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                border: "none",
                backgroundColor: "transparent",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                transition: "background-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f3f4f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    backgroundColor: "#e0f2fe",
                    color: "#0369a1",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  /{item.shortcut}
                </span>
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#374151",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {item.content}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default CannedResponsePicker;
