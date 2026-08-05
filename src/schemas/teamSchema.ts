import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().min(1, "Team name is required").max(255),
  description: z.string().max(1000).optional(),
  allow_auto_assign: z.boolean().default(true),
});

export const addTeamMemberSchema = z.object({
  user_id: z.number().int().positive("user_id is required"),
  role: z.enum(["admin", "member"]).default("member"),
});

export type CreateTeamDto = z.infer<typeof createTeamSchema>;
export type AddTeamMemberDto = z.infer<typeof addTeamMemberSchema>;
