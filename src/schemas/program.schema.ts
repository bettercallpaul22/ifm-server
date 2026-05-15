import { z } from "zod";

const optionalIsoDate = z
  .string()
  .trim()
  .datetime({ offset: true })
  .or(z.string().trim().datetime())
  .optional();

const dateOrderRefinement = (
  data: { startDate?: string; endDate?: string },
  ctx: z.RefinementCtx,
) => {
  if (!data.startDate || !data.endDate) return;
  const start = new Date(data.startDate).getTime();
  const end = new Date(data.endDate).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return;
  if (end < start) {
    ctx.addIssue({
      code: "custom",
      message: "endDate must be greater than or equal to startDate",
      path: ["endDate"],
    });
  }
};

export const programStatusSchema = z.enum(["draft", "upcoming", "live", "completed", "cancelled"]);

const programBaseSchema = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(10).max(3000),
  imageUrl: z.string().trim().url().max(2048),
  location: z.string().trim().max(160).optional(),
  category: z.string().trim().max(80).optional(),
  startDate: optionalIsoDate,
  endDate: optionalIsoDate,
  status: programStatusSchema.default("upcoming"),
});

export const programSchema = programBaseSchema.superRefine(dateOrderRefinement);

export const programPatchSchema = programBaseSchema.partial().superRefine(dateOrderRefinement);

export type ProgramInput = z.infer<typeof programSchema>;
export type ProgramPatchInput = z.infer<typeof programPatchSchema>;

export type ProgramRecord = ProgramInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};