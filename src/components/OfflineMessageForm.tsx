import React, { useState } from "react";

export interface OfflineMessageFormProps {
  /** ID of the inbox to submit the offline message to */
  inboxId: number;
  /** Base URL of the API server */
  apiHost?: string;
  /** Heading shown at the top of the form */
  title?: string;
  /** Sub-heading / helper text */
  description?: string;
}

type FormState = "idle" | "submitting" | "success" | "error";

/**
 * OfflineMessageForm — displayed when no support agents are online.
 * Visitors can leave their name, email, and message which is stored
 * as a 'pending' conversation for agents to handle later.
 */
export function OfflineMessageForm({
  inboxId,
  apiHost = "http://localhost:3000",
  title = "Leave us a message",
  description = "Our team is currently offline. Submit your message and we'll respond as soon as possible.",
}: OfflineMessageFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorText, setErrorText] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setFormState("submitting");
    setErrorText("");

    try {
      const res = await fetch(`${apiHost}/api/v1/offline-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inbox_id: inboxId,
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });

      if (res.ok) {
        setFormState("success");
      } else {
        const data: any = await res.json();
        setErrorText(data?.message ?? "Something went wrong. Please try again.");
        setFormState("error");
      }
    } catch {
      setErrorText("Network error. Please check your connection and try again.");
      setFormState("error");
    }
  };

  if (formState === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
          padding: "32px 24px",
          textAlign: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: "48px" }}>✅</div>
        <h2 style={{ margin: 0, fontSize: "20px", color: "#111827" }}>
          Message received!
        </h2>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
          Thank you for reaching out. Our team will get back to you shortly.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Offline message form"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "24px",
        fontFamily: "sans-serif",
        maxWidth: "480px",
      }}
    >
      <div>
        <h2 style={{ margin: "0 0 4px", fontSize: "20px", color: "#111827" }}>
          {title}
        </h2>
        <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
          {description}
        </p>
      </div>

      {formState === "error" && (
        <div
          role="alert"
          style={{
            padding: "10px 12px",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "6px",
            color: "#dc2626",
            fontSize: "13px",
          }}
        >
          {errorText}
        </div>
      )}

      {/* Name */}
      <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>
          Name <span aria-hidden="true" style={{ color: "#ef4444" }}>*</span>
        </span>
        <input
          id="offline-msg-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Your full name"
          disabled={formState === "submitting"}
          style={inputStyle}
        />
      </label>

      {/* Email */}
      <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>
          Email <span aria-hidden="true" style={{ color: "#ef4444" }}>*</span>
        </span>
        <input
          id="offline-msg-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          placeholder="you@example.com"
          disabled={formState === "submitting"}
          style={inputStyle}
        />
      </label>

      {/* Message */}
      <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>
          Message <span aria-hidden="true" style={{ color: "#ef4444" }}>*</span>
        </span>
        <textarea
          id="offline-msg-message"
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.currentTarget.value)}
          placeholder="How can we help you?"
          disabled={formState === "submitting"}
          style={{ ...inputStyle, resize: "vertical", minHeight: "96px" }}
        />
      </label>

      <button
        id="offline-msg-submit"
        type="submit"
        disabled={formState === "submitting" || !name.trim() || !email.trim() || !message.trim()}
        style={{
          backgroundColor: formState === "submitting" ? "#93c5fd" : "#1f93ff",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          padding: "10px 20px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: formState === "submitting" ? "not-allowed" : "pointer",
          transition: "background-color 0.2s ease",
        }}
      >
        {formState === "submitting" ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  padding: "8px 12px",
  fontSize: "14px",
  color: "#111827",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

export default OfflineMessageForm;
