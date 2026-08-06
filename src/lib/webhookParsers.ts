/**
 * Webhook Channel Parsers — VS-OMNICHANNEL-001
 *
 * Each parser normalises a raw platform payload into a unified IncomingMessage object.
 */

export interface IncomingMessage {
  /** Unique sender identifier on the external platform */
  senderId: string;
  /** Human-readable sender name (may be phone number if unavailable) */
  senderName: string;
  /** Message text body */
  body: string;
  /** Raw platform-specific message ID (for idempotency) */
  platformMessageId?: string;
}

/** ──────────────────────────────────────────────────────
 *  Twilio / WhatsApp Business API parser
 *  Twilio sends x-www-form-urlencoded POSTs
 * ────────────────────────────────────────────────────── */
export function parseTwilioPayload(body: Record<string, string>): IncomingMessage | null {
  const from = body["From"] ?? body["from"];          // e.g. "whatsapp:+15551234567"
  const text = body["Body"] ?? body["body"];          // Message text
  const msgSid = body["MessageSid"] ?? body["SmsSid"];

  if (!from || !text) return null;

  // Strip "whatsapp:" prefix if present
  const phone = from.replace(/^whatsapp:/i, "");
  return {
    senderId: phone,
    senderName: phone,
    body: text,
    platformMessageId: msgSid,
  };
}

/** ──────────────────────────────────────────────────────
 *  Meta (Facebook Messenger) Webhooks parser
 *  Meta sends JSON POSTs with a messaging[] array
 * ────────────────────────────────────────────────────── */
export function parseMetaPayload(raw: Record<string, any>): IncomingMessage | null {
  try {
    const entry = raw?.entry?.[0];
    const messaging = entry?.messaging?.[0] ?? entry?.changes?.[0]?.value?.messages?.[0];
    if (!messaging) return null;

    // Support WhatsApp Cloud API, Instagram DM, and Messenger
    const senderId: string =
      messaging?.sender?.id ??
      messaging?.from ??
      messaging?.from?.id ??
      "";

    const text: string =
      messaging?.message?.text ??
      messaging?.text?.body ??
      messaging?.caption ??
      "";

    const msgId: string = messaging?.message?.mid ?? messaging?.id ?? "";

    if (!senderId || !text) return null;

    const contacts = entry?.changes?.[0]?.value?.contacts?.[0];

    return {
      senderId,
      senderName: contacts?.profile?.name ?? senderId,
      body: text,
      platformMessageId: msgId,
    };
  } catch {
    return null;
  }
}

/** ──────────────────────────────────────────────────────
 *  Reply-back helpers — send replies to the external platform
 * ────────────────────────────────────────────────────── */

/**
 * sendTwilioReply — sends a WhatsApp reply via Twilio REST API.
 *
 * Required env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 */
export async function sendTwilioReply(to: string, body: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    console.warn("[webhook] Twilio env vars not set, skipping reply");
    return;
  }
  const toNumber = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  const fromNumber = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const params = new URLSearchParams({ To: toNumber, From: fromNumber, Body: body });
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
  } catch (err) {
    console.error("[webhook] Twilio reply failed:", err);
  }
}

/**
 * sendMetaReply — sends a Facebook Messenger reply via Meta Graph API.
 *
 * Required env vars: META_PAGE_ACCESS_TOKEN
 */
export async function sendMetaReply(recipientId: string, body: string): Promise<void> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) {
    console.warn("[webhook] META_PAGE_ACCESS_TOKEN not set, skipping reply");
    return;
  }
  try {
    await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: body },
      }),
    });
  } catch (err) {
    console.error("[webhook] Meta reply failed:", err);
  }
}

/**
 * sendWhatsAppCloudReply — sends outbound WhatsApp message via Meta Cloud API
 */
export async function sendWhatsAppCloudReply(phoneId: string, accessToken: string, recipientPhone: string, body: string): Promise<void> {
  try {
    await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: recipientPhone,
        type: "text",
        text: { body },
      }),
    });
  } catch (err) {
    console.error("[webhook] WhatsApp Cloud API reply failed:", err);
  }
}

/**
 * sendInstagramReply — sends outbound Instagram DM reply via Meta Graph API
 */
export async function sendInstagramReply(pageId: string, accessToken: string, recipientId: string, body: string): Promise<void> {
  try {
    await fetch(`https://graph.facebook.com/v19.0/${pageId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: body },
      }),
    });
  } catch (err) {
    console.error("[webhook] Instagram Direct reply failed:", err);
  }
}
