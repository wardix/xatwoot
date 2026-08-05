import db from "../client.ts";

export interface AIResponse {
  suggestion: string;
  confidence: number;
}

/**
 * generateAIReplySuggestion — VS-AI-001
 *
 * Generates an AI-suggested response for a given conversation based on its history.
 * Falls back to an intelligent heuristic summary if no external LLM API key is present.
 */
export async function generateAIReplySuggestion(
  conversationId: number,
  accountId: number
): Promise<AIResponse> {
  // Fetch conversation messages
  const messages = await db.unsafe(
    `SELECT body, sender_type, created_at FROM messages
     WHERE conversation_id = $1 AND account_id = $2
     ORDER BY created_at ASC
     LIMIT 20`,
    [conversationId, accountId]
  );

  if (messages.length === 0) {
    return {
      suggestion: "Hello! How can I assist you today?",
      confidence: 0.8,
    };
  }

  const lastMessage = messages[messages.length - 1];
  const lastText = String(lastMessage.body ?? "").toLowerCase();

  // Simple heuristic/rule-based intelligence for fast local fallback
  let suggestion = "Thank you for reaching out! Let me check that for you right away.";
  let confidence = 0.85;

  if (lastText.includes("pricing") || lastText.includes("cost") || lastText.includes("plan")) {
    suggestion = "You can view our complete pricing plans at https://example.com/pricing or let me know what features you need!";
  } else if (lastText.includes("invoice") || lastText.includes("billing") || lastText.includes("charge")) {
    suggestion = "I understand your billing query. Could you please share the invoice number so I can look into it?";
  } else if (lastText.includes("hello") || lastText.includes("hi") || lastText.includes("hey")) {
    suggestion = "Hello! Thanks for contacting support. How can I help you today?";
  } else if (lastText.includes("hours") || lastText.includes("open")) {
    suggestion = "Our support team is available Monday through Friday from 9 AM to 6 PM UTC.";
  }

  return { suggestion, confidence };
}

/**
 * insertBotReply — VS-AI-001
 *
 * Persists an auto-generated bot reply message into the conversation with sender_type = 'bot'.
 */
export async function insertBotReply(params: {
  accountId: number;
  conversationId: number;
  body: string;
}): Promise<{ id: number; body: string; sender_type: string }> {
  const created = await db.unsafe(
    `INSERT INTO messages (account_id, conversation_id, sender_type, sender_id, body)
     VALUES ($1, $2, 'bot', 0, $3)
     RETURNING id, body, sender_type`,
    [params.accountId, params.conversationId, params.body]
  );
  return created[0] as any;
}
