import { z } from "zod";

export const CONVERSATION_STATUS = ["open", "pending", "resolved", "snoozed"] as const;
export const CONVERSATION_PRIORITY = ["low", "medium", "high", "urgent"] as const;

export const createConversationSchema = z.object({
  inbox_id: z.number().int().positive("inbox_id is required"),
  contact_id: z.number().int().positive("contact_id is required"),
  assignee_id: z.number().int().positive().optional(),
  status: z.enum(CONVERSATION_STATUS).default("open"),
  priority: z.enum(CONVERSATION_PRIORITY).default("medium"),
  subject: z.string().max(500).optional(),
});

export const updateConversationSchema = z.object({
  status: z.enum(CONVERSATION_STATUS).optional(),
  priority: z.enum(CONVERSATION_PRIORITY).optional(),
  assignee_id: z.number().int().positive().nullable().optional(),
  subject: z.string().max(500).optional(),
});

export type CreateConversationDto = z.infer<typeof createConversationSchema>;
export type UpdateConversationDto = z.infer<typeof updateConversationSchema>;
