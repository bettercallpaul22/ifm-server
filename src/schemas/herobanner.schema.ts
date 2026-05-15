import { z } from "zod";

const heroBannerBaseSchema = z.object({
  eyebrow: z.string().trim().min(2).max(80),
  title: z.string().trim().min(3).max(120),
  subtitle: z.string().trim().min(3).max(180),
  description: z.string().trim().min(10).max(2000),
  imageUrl: z.string().trim().url().max(2048),
  primaryCtaLabel: z.string().trim().min(2).max(60),
  secondaryCtaLabel: z.string().trim().min(2).max(60),
  highlight: z.string().trim().min(2).max(120),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export const heroBannerSchema = heroBannerBaseSchema;
export const heroBannerPatchSchema = heroBannerBaseSchema.partial();

export type HeroBannerInput = z.infer<typeof heroBannerSchema>;
export type HeroBannerPatchInput = z.infer<typeof heroBannerPatchSchema>;

export type HeroBannerRecord = HeroBannerInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
