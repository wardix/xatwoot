import { z } from "zod";

export const SENDER_TYPES = ["user", "contact"] as const;
export const MESSAGE_TYPES = ["text", "image", "file", "audio"] as const;
export const MESSAGE_STATUSES = ["sending", "sent", "delivered", "read"] as const;

export const createMessageSchema = z.object({
  conversation_id: z.number().int().positive().optional(),
  sender_type: z.enum(SENDER_TYPES).default("user"),
  sender_id: z.number().int().positive().optional(),
  body: z.string().min(1, "Body is required"),
  message_type: z.enum(MESSAGE_TYPES).default("text"),
  status: z.enum(MESSAGE_STATUSES).default("sent"),
  private: z.boolean().default(false),
  media_url: z.string().url().optional(),
  external_id: z.string().max(255).optional(),
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        file_type: z.string().optional(),
        mime_type: z.string().optional(),
        file_size: z.number().optional(),
      })
    )
    .optional(),
});

export type CreateMessageDto = z.infer<typeof createMessageSchema>;
