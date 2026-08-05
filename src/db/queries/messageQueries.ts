import db from "../client.ts";

export interface Message {
  id: number;
  conversation_id: number;
  sender_type: "user" | "contact";
  sender_id: number | null;
  body: string;
  message_type: "text" | "image" | "file" | "audio";
  status: "sending" | "sent" | "delivered" | "read";
  private: boolean;
  media_url: string | null;
  external_id: string | null;
  account_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateMessageInput {
  account_id: number;
  conversation_id: number;
  sender_type?: "user" | "contact";
  sender_id?: number | null;
  body: string;
  message_type?: Message["message_type"];
  status?: Message["status"];
  private?: boolean;
  media_url?: string | null;
  external_id?: string | null;
}

export async function createMessage(input: CreateMessageInput): Promise<Message> {
  const {
    account_id,
    conversation_id,
    sender_type = "user",
    sender_id = null,
    body,
    message_type = "text",
    status = "sent",
    private: isPrivate = false,
    media_url = null,
    external_id = null,
  } = input;

  const rows = await db.unsafe(
    `INSERT INTO messages
       (account_id, conversation_id, sender_type, sender_id, body, message_type, status, private, media_url, external_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      account_id,
      conversation_id,
      sender_type,
      sender_id,
      body,
      message_type,
      status,
      isPrivate,
      media_url,
      external_id,
    ]
  );

  // Update conversation last_activity_at timestamp
  await db.unsafe(
    `UPDATE conversations SET last_activity_at = NOW(), updated_at = NOW() WHERE id = $1 AND account_id = $2`,
    [conversation_id, account_id]
  );

  return rows[0] as Message;
}

export async function listMessagesByConversation(
  conversation_id: number,
  account_id: number
): Promise<Message[]> {
  const rows = await db.unsafe(
    `SELECT * FROM messages
     WHERE conversation_id = $1 AND account_id = $2
     ORDER BY created_at ASC`,
    [conversation_id, account_id]
  );
  return rows as Message[];
}

export async function findMessageById(id: number, account_id: number): Promise<Message | null> {
  const rows = await db.unsafe(
    `SELECT * FROM messages WHERE id = $1 AND account_id = $2 LIMIT 1`,
    [id, account_id]
  );
  return (rows[0] as Message) ?? null;
}
