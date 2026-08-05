import { z } from "zod";

export const CHANNEL_TYPES = ["web_widget", "email", "whatsapp", "facebook", "telegram"] as const;

export const createInboxSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  channel_type: z.enum(CHANNEL_TYPES, { error: "Invalid channel type" }),
  integration_config: z.record(z.string(), z.unknown()).default({}),
  enabled: z.boolean().default(true),
  greeting_enabled: z.boolean().default(false),
});

export const updateInboxSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  integration_config: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
  greeting_enabled: z.boolean().optional(),
});

export type CreateInboxDto = z.infer<typeof createInboxSchema>;
export type UpdateInboxDto = z.infer<typeof updateInboxSchema>;
