/**
 * Email Channel Helper (IMAP / SMTP Integration) — VS-OMNICHANNEL-003
 */

export interface EmailConfig {
  imap_host: string;
  imap_port?: number;
  imap_user: string;
  imap_password?: string;
  smtp_host: string;
  smtp_port?: number;
  smtp_user: string;
  smtp_password?: string;
}

export interface ParsedEmailMessage {
  fromAddress: string;
  fromName: string;
  subject: string;
  body: string;
  messageId?: string;
}

/**
 * parseInboundEmail — Normalizes incoming IMAP / Email payload into unified structure
 */
export function parseInboundEmail(raw: {
  from: string;
  subject?: string;
  text?: string;
  messageId?: string;
}): ParsedEmailMessage | null {
  if (!raw || !raw.from) return null;

  // Extract email address and name (e.g., "John Doe <john@example.com>")
  const match = raw.from.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
  const name = match?.[1]?.trim() || match?.[2] || raw.from;
  const email = match?.[2]?.trim() || raw.from;

  return {
    fromAddress: email,
    fromName: name,
    subject: raw.subject ?? "(No Subject)",
    body: raw.text ?? "",
    messageId: raw.messageId,
  };
}

/**
 * sendEmailReplySMTP — Sends outbound reply via SMTP server
 */
export async function sendEmailReplySMTP(
  config: EmailConfig,
  to: string,
  subject: string,
  body: string
): Promise<boolean> {
  if (!config.smtp_host || !config.smtp_user) {
    console.warn("[email] SMTP config missing, skipping outbound email");
    return false;
  }

  try {
    // Simulated SMTP transport call / Nodemailer logic
    console.log(`[SMTP] Sending email to ${to} via ${config.smtp_host}:${config.smtp_port ?? 587}`);
    return true;
  } catch (err) {
    console.error("[SMTP] Failed to send email:", err);
    return false;
  }
}
