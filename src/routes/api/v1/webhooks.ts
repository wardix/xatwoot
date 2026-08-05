import { Hono } from "hono";
import {
  parseTwilioPayload,
  parseMetaPayload,
} from "@/lib/webhookParsers.ts";
import {
  findOrCreateContactByPhone,
  findOrCreateContactByExternalId,
  findOrCreateWebhookConversation,
  insertWebhookMessage,
} from "@/db/queries/webhookQueries.ts";

const webhookRoutes = new Hono();

/**
 * GET /api/v1/webhooks/meta — Meta Webhook Verification Challenge
 * Meta sends a GET request with hub.challenge when registering the webhook.
 */
webhookRoutes.get("/meta", (c) => {
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");
  const verifyToken = process.env.META_VERIFY_TOKEN ?? "xatwoot_meta_verify";

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return c.text(challenge, 200);
  }
  return c.json({ error: "Forbidden" }, 403);
});

/**
 * POST /api/v1/webhooks/:channel — Universal inbound webhook endpoint
 *
 * :channel can be:
 *   - "twilio"    — Twilio WhatsApp Business messages
 *   - "meta"      — Facebook Messenger messages
 *
 * Required query params:
 *   ?account_id=<number>   — The Xatwoot account to route into
 *   ?inbox_id=<number>     — The target inbox
 */
webhookRoutes.post("/:channel", async (c) => {
  const channel = c.req.param("channel");
  const accountId = Number(c.req.query("account_id"));
  const inboxId = Number(c.req.query("inbox_id"));

  if (!accountId || !inboxId) {
    return c.json({ error: "account_id and inbox_id query params are required" }, 422);
  }

  let parsed: { senderId: string; senderName: string; body: string; platformMessageId?: string } | null = null;

  if (channel === "twilio") {
    // Twilio sends x-www-form-urlencoded
    let formBody: Record<string, string> = {};
    try {
      const text = await c.req.text();
      for (const pair of text.split("&")) {
        const [k, v] = pair.split("=");
        if (k) formBody[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
      }
    } catch {
      return c.json({ error: "Invalid form body" }, 400);
    }
    parsed = parseTwilioPayload(formBody);
  } else if (channel === "meta") {
    // Meta sends JSON
    let jsonBody: Record<string, any> = {};
    try {
      jsonBody = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }
    parsed = parseMetaPayload(jsonBody);
  } else {
    return c.json({ error: `Unsupported channel: ${channel}` }, 404);
  }

  if (!parsed) {
    // Return 200 to the platform to prevent retries, but log the skip
    return c.json({ status: "skipped", reason: "could not parse payload" }, 200);
  }

  // 1. Map sender to a Xatwoot contact
  let contact: { id: number; name: string };
  if (channel === "twilio") {
    contact = await findOrCreateContactByPhone({
      accountId,
      phone: parsed.senderId,
      name: parsed.senderName,
    });
  } else {
    contact = await findOrCreateContactByExternalId({
      accountId,
      externalId: parsed.senderId,
      name: parsed.senderName,
    });
  }

  // 2. Find or create an open conversation in the target inbox
  const conversation = await findOrCreateWebhookConversation({
    accountId,
    inboxId,
    contactId: contact.id,
  });

  // 3. Persist the inbound message
  const message = await insertWebhookMessage({
    accountId,
    conversationId: conversation.id,
    contactId: contact.id,
    body: parsed.body,
  });

  return c.json(
    {
      status: "received",
      channel,
      contact_id: contact.id,
      conversation_id: conversation.id,
      message_id: message.id,
    },
    200
  );
});

export { webhookRoutes };
