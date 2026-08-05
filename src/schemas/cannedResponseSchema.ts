import { z } from "zod/v4";

export const createCannedResponseSchema = z.object({
  shortcut: z
    .string()
    .min(1, "Shortcut is required")
    .max(255)
    .regex(/^[a-zA-Z0-9_-]+$/, "Shortcut must be alphanumeric, hyphen, or underscore"),
  content: z.string().min(1, "Content is required"),
});

export const updateCannedResponseSchema = createCannedResponseSchema.partial();

export type CreateCannedResponseDto = z.infer<typeof createCannedResponseSchema>;
export type UpdateCannedResponseDto = z.infer<typeof updateCannedResponseSchema>;
