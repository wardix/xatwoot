import React, { useState } from "react";
import { getLocale, setLocale, type SupportedLocale } from "../lib/i18n.ts";

export function LanguageSelector() {
  const [lang, setLangState] = useState<SupportedLocale>(getLocale());

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value as SupportedLocale;
    setLocale(selected);
    setLangState(selected);
    window.location.reload(); // Apply locale globally across UI
  };

  return (
    <div style={{ padding: "16px", backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
      <h3 style={{ margin: "0 0 8px", fontSize: "16px", color: "#111827" }}>🌐 Language & Internationalization</h3>
      <p style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 12px" }}>
        Select your preferred display language for the agent dashboard.
      </p>
      <select
        value={lang}
        onChange={handleChange}
        style={{
          padding: "8px 12px",
          borderRadius: "6px",
          border: "1px solid #d1d5db",
          fontSize: "14px",
          backgroundColor: "#ffffff",
          cursor: "pointer",
        }}
      >
        <option value="en">English (US)</option>
        <option value="id">Bahasa Indonesia</option>
        <option value="es">Español</option>
      </select>
    </div>
  );
}
