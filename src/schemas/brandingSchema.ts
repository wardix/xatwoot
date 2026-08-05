import { z } from "zod/v4";

export const updateBrandingSchema = z.object({
  logo_url: z.string().url("Invalid URL").optional(),
  primary_color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color").optional(),
  company_name: z.string().max(255).optional(),
  favicon_url: z.string().url("Invalid URL").optional(),
  custom_css: z.string().optional(),
});

export type UpdateBrandingDto = z.infer<typeof updateBrandingSchema>;
