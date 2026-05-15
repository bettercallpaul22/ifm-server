import { z } from "zod";

const normalizePhone = (value: string) => value.replace(/\s+/g, "").trim();

export const memberSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(255),
  imageUrl: z.string().trim().url().max(2048).optional(),
  phone: z
    .string()
    .trim()
    .transform(normalizePhone)
    .refine((value) => /^\+?[0-9-]{8,20}$/.test(value), "Invalid phone number")
    .optional(),
  dateOfBirth: z.string().trim().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  address: z.string().trim().max(255).optional(),
  city: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  membershipStatus: z.enum(["pending", "active", "inactive"]).default("pending"),
  notes: z.string().trim().max(1000).optional(),
});

export type MemberInput = z.infer<typeof memberSchema>;

export type MemberRecord = MemberInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
