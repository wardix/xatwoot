import { z } from "zod";

export const createLabelSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Hex color code required e.g. #FF0000").optional(),
});

export const assignConversationLabelsSchema = z.object({
  labels: z.array(z.string().min(1)).min(1, "At least one label name is required"),
});

export type CreateLabelDto = z.infer<typeof createLabelSchema>;
export type AssignConversationLabelsDto = z.infer<typeof assignConversationLabelsSchema>;
