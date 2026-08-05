import React from "react";

export interface TypingIndicatorProps {
  /** List of names currently typing in the conversation */
  typingUsers: string[];
}

/**
 * TypingIndicator displays an animated "is typing..." indicator
 * when one or more users are actively composing a message.
 */
export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  let label: string;
  if (typingUsers.length === 1) {
    label = `${typingUsers[0]} is typing`;
  } else if (typingUsers.length === 2) {
    label = `${typingUsers[0]} and ${typingUsers[1]} are typing`;
  } else {
    label = `${typingUsers[0]} and ${typingUsers.length - 1} others are typing`;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 8px",
        fontSize: "12px",
        color: "#6b7280",
        fontStyle: "italic",
      }}
    >
      <span>{label}</span>
      <TypingDots />
    </div>
  );
}

/** Animated three-dot typing indicator */
function TypingDots() {
  return (
    <span
      aria-hidden="true"
      style={{ display: "inline-flex", gap: "2px", alignItems: "center" }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: "4px",
            height: "4px",
            borderRadius: "50%",
            backgroundColor: "#9ca3af",
            display: "inline-block",
            animation: `typing-bounce 1.2s infinite ease-in-out`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes typing-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </span>
  );
}

export default TypingIndicator;
