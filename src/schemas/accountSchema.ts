import { z } from "zod";

export const createAccountSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.string().email("Invalid email address").max(255),
  phone_number: z.string().max(50).optional(),
  domain: z.string().max(255).optional(),
  support_email: z.string().email("Invalid support email").max(255).optional(),
  locale: z.string().max(10).default("en"),
  settings: z.record(z.string(), z.unknown()).default({}),
  limits: z
    .object({ conversations: z.number().int().positive().default(1000) })
    .default({ conversations: 1000 }),
});

export type CreateAccountDto = z.infer<typeof createAccountSchema>;
