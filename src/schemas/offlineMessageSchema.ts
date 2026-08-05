import { z } from "zod/v4";

export const createOfflineMessageSchema = z.object({
  inbox_id: z.number().int().positive(),
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email"),
  message: z.string().min(1, "Message is required"),
  subject: z.string().max(255).optional(),
});

export type CreateOfflineMessageInput = z.infer<typeof createOfflineMessageSchema>;
