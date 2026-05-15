import { z } from "zod";

export const departmentMemberRoleSchema = z.enum(["leader", "assistant_leader", "member"]);
export const departmentMemberStatusSchema = z.enum(["active", "suspended"]);

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(400).optional(),
});

export const addDepartmentMemberSchema = z.object({
  memberId: z.string().trim().min(1),
  role: departmentMemberRoleSchema,
});

export const suspendDepartmentMemberSchema = z.object({
  reason: z.string().trim().max(300).optional(),
});

export type DepartmentMemberRole = z.infer<typeof departmentMemberRoleSchema>;

export type DepartmentMemberRecord = {
  memberId: string;
  role: DepartmentMemberRole;
  status: z.infer<typeof departmentMemberStatusSchema>;
  addedAt: string;
  updatedAt: string;
  suspendedAt?: string;
  suspendedReason?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  imageUrl?: string;
};

export type DepartmentRecord = {
  id: string;
  name: string;
  description?: string;
  members: DepartmentMemberRecord[];
  createdAt: string;
  updatedAt: string;
};