import { z } from "zod";

export const createAttachmentSchema = z.object({
  message_id: z.number().int().positive().optional(),
  url: z.string().url("Valid URL is required"),
  file_type: z.string().default("file"),
  mime_type: z.string().max(100).optional(),
  file_size: z.number().int().positive().optional(),
});

export type CreateAttachmentDto = z.infer<typeof createAttachmentSchema>;
