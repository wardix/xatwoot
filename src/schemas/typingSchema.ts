import { z } from "zod/v4";

export const typingActionSchema = z.object({
  action: z.enum(["start", "stop"]),
});

export type TypingActionInput = z.infer<typeof typingActionSchema>;
