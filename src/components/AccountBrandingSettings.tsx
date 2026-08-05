import React, { useState } from "react";

export interface BrandingConfig {
  logo_url?: string;
  primary_color?: string;
  company_name?: string;
  favicon_url?: string;
  custom_css?: string;
}

export interface AccountBrandingSettingsProps {
  accountId: number;
  token: string;
  initialBranding?: BrandingConfig;
  apiHost?: string;
  onSaveSuccess?: (updatedBranding: BrandingConfig) => void;
}

export function AccountBrandingSettings({
  accountId,
  token,
  initialBranding = {},
  apiHost = "http://localhost:3000",
  onSaveSuccess,
}: AccountBrandingSettingsProps) {
  const [logoUrl, setLogoUrl] = useState(initialBranding.logo_url ?? "");
  const [primaryColor, setPrimaryColor] = useState(
    initialBranding.primary_color ?? "#1f93ff"
  );
  const [companyName, setCompanyName] = useState(
    initialBranding.company_name ?? ""
  );
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    setErrorMessage("");

    try {
      const res = await fetch(`${apiHost}/api/v1/accounts/${accountId}/branding`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          logo_url: logoUrl || undefined,
          primary_color: primaryColor || undefined,
          company_name: companyName || undefined,
        }),
      });

      if (res.ok) {
        const body = await res.json();
        setStatus("success");
        if (onSaveSuccess && body.branding) {
          onSaveSuccess(body.branding);
        }
      } else {
        const err = await res.json();
        setErrorMessage(err.message ?? "Failed to save branding settings");
        setStatus("error");
      }
    } catch {
      setErrorMessage("Network error while saving settings");
      setStatus("error");
    }
  };

  return (
    <div
      style={{
        maxWidth: "600px",
        padding: "24px",
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        border: "1px solid #e5e7eb",
        fontFamily: "sans-serif",
      }}
    >
      <h2 style={{ margin: "0 0 8px", fontSize: "18px", color: "#111827" }}>
        Branding Settings
      </h2>
      <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#6b7280" }}>
        Customize your organization's logo, primary brand color, and display name.
      </p>

      {status === "success" && (
        <div
          role="status"
          style={{
            padding: "10px 12px",
            marginBottom: "16px",
            backgroundColor: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            borderRadius: "6px",
            fontSize: "13px",
          }}
        >
          Branding settings updated successfully!
        </div>
      )}

      {status === "error" && (
        <div
          role="alert"
          style={{
            padding: "10px 12px",
            marginBottom: "16px",
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            borderRadius: "6px",
            fontSize: "13px",
          }}
        >
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>
            Company Name
          </span>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Corp"
            style={inputStyle}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>
            Logo URL
          </span>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            style={inputStyle}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>
            Primary Color
          </span>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              style={{ width: "36px", height: "36px", padding: 0, border: "none", cursor: "pointer" }}
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#1f93ff"
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
        </label>

        <button
          type="submit"
          disabled={status === "saving"}
          style={{
            marginTop: "8px",
            alignSelf: "flex-start",
            backgroundColor: primaryColor,
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            padding: "10px 18px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: status === "saving" ? "not-allowed" : "pointer",
            opacity: status === "saving" ? 0.7 : 1,
          }}
        >
          {status === "saving" ? "Saving..." : "Save Branding"}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: "6px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
  outline: "none",
};

export default AccountBrandingSettings;
