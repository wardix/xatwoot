import { z } from "zod";

export const createContactSchema = z.object({
  name: z.string().max(255).optional(),
  email: z.string().email("Invalid email format").max(255).optional(),
  phone_number: z.string().max(50).optional(),
  avatar_url: z.string().url("Invalid URL").max(1000).optional(),
  additional_attributes: z.record(z.string(), z.unknown()).default({}),
});

export const updateContactSchema = z.object({
  name: z.string().max(255).optional(),
  email: z.string().email("Invalid email format").max(255).optional(),
  phone_number: z.string().max(50).optional(),
  avatar_url: z.string().url("Invalid URL").max(1000).optional(),
  additional_attributes: z.record(z.string(), z.unknown()).optional(),
});

export type CreateContactDto = z.infer<typeof createContactSchema>;
export type UpdateContactDto = z.infer<typeof updateContactSchema>;
