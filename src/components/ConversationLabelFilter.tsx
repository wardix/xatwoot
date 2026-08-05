import React from "react";

export interface LabelItem {
  id: number;
  name: string;
  color?: string;
}

export interface ConversationLabelFilterProps {
  labels: LabelItem[];
  selectedLabel: string | null;
  onSelectLabel: (labelName: string | null) => void;
}

/**
 * ConversationLabelFilter — UI component to filter conversation list by tag/label.
 */
export function ConversationLabelFilter({
  labels,
  selectedLabel,
  onSelectLabel,
}: ConversationLabelFilterProps) {
  return (
    <div
      role="group"
      aria-label="Filter conversations by label"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        flexWrap: "wrap",
        padding: "8px 12px",
        backgroundColor: "#f9fafb",
        borderBottom: "1px solid #e5e7eb",
        fontFamily: "sans-serif",
      }}
    >
      <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: 600 }}>
        Filter by Label:
      </span>

      <button
        type="button"
        onClick={() => onSelectLabel(null)}
        style={{
          padding: "4px 8px",
          borderRadius: "12px",
          border: selectedLabel === null ? "1px solid #3b82f6" : "1px solid #d1d5db",
          backgroundColor: selectedLabel === null ? "#eff6ff" : "#ffffff",
          color: selectedLabel === null ? "#1d4ed8" : "#374151",
          fontSize: "12px",
          fontWeight: 500,
          cursor: "pointer",
          transition: "all 0.15s ease",
        }}
      >
        All
      </button>

      {labels.map((lbl) => {
        const isSelected = selectedLabel === lbl.name;
        const tagColor = lbl.color ?? "#3b82f6";
        return (
          <button
            key={lbl.id}
            type="button"
            onClick={() => onSelectLabel(isSelected ? null : lbl.name)}
            style={{
              padding: "4px 10px",
              borderRadius: "12px",
              border: isSelected ? `1px solid ${tagColor}` : "1px solid #d1d5db",
              backgroundColor: isSelected ? `${tagColor}20` : "#ffffff",
              color: isSelected ? tagColor : "#374151",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "all 0.15s ease",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: tagColor,
                display: "inline-block",
              }}
            />
            {lbl.name}
          </button>
        );
      })}
    </div>
  );
}

export default ConversationLabelFilter;
