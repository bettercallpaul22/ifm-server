import { Request, Response } from "express";
import { db, firebaseInitError, firebaseReady } from "../config/firebaseAdmin.js";
import {
  addDepartmentMemberSchema,
  createDepartmentSchema,
  suspendDepartmentMemberSchema,
  type DepartmentMemberRecord,
  type DepartmentRecord,
} from "../schemas/department.schema.js";

const DEPARTMENTS_COLLECTION = "departments";
const MEMBERS_COLLECTION = "members";

function ensureFirebaseConfigured(res: Response) {
  if (firebaseReady && db && !firebaseInitError) return true;

  res.status(503).json({
    message:
      "Firebase Admin is not ready. Provide FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY in server/.env or place a valid service account file at server/intimate_service_acc.json.",
    details: firebaseInitError || "Missing Firebase Admin configuration.",
  });
  return false;
}

function stripUndefinedFields<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T;
}

export async function createDepartment(req: Request, res: Response) {
  if (!ensureFirebaseConfigured(res)) return;

  const parsed = createDepartmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid department payload",
      errors: parsed.error.flatten(),
    });
  }

  const now = new Date().toISOString();
  const payload = stripUndefinedFields({
    name: parsed.data.name,
    description: parsed.data.description,
    members: [] as DepartmentMemberRecord[],
    createdAt: now,
    updatedAt: now,
  });

  try {
    const docRef = await db!.collection(DEPARTMENTS_COLLECTION).add(payload);
    const response: DepartmentRecord = {
      id: docRef.id,
      ...(payload as Omit<DepartmentRecord, "id">),
    };
    return res.status(201).json(response);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create department",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function fetchDepartments(req: Request, res: Response) {
  if (!ensureFirebaseConfigured(res)) return;

  try {
    const rawQuery = String(req.query.q ?? "").trim().toLowerCase();
    const snapshot = await db!.collection(DEPARTMENTS_COLLECTION).orderBy("createdAt", "desc").get();

    const allDepartments: DepartmentRecord[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<DepartmentRecord, "id">),
    }));

    const items = rawQuery
      ? allDepartments.filter((department) => {
          const haystack = [department.name, department.description]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(rawQuery);
        })
      : allDepartments;

    return res.status(200).json({
      items,
      total: items.length,
      query: rawQuery,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch departments",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function fetchDepartmentById(req: Request, res: Response) {
  if (!ensureFirebaseConfigured(res)) return;

  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "Department id is required" });

  try {
    const docRef = db!.collection(DEPARTMENTS_COLLECTION).doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ message: "Department not found" });

    return res.status(200).json({
      id: doc.id,
      ...(doc.data() as Omit<DepartmentRecord, "id">),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch department",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function addMemberToDepartment(req: Request, res: Response) {
  if (!ensureFirebaseConfigured(res)) return;

  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "Department id is required" });

  const parsed = addDepartmentMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid department member payload",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const departmentRef = db!.collection(DEPARTMENTS_COLLECTION).doc(id);
    const departmentDoc = await departmentRef.get();

    if (!departmentDoc.exists) {
      return res.status(404).json({ message: "Department not found" });
    }

    const memberRef = db!.collection(MEMBERS_COLLECTION).doc(parsed.data.memberId);
    const memberDoc = await memberRef.get();

    if (!memberDoc.exists) {
      return res.status(404).json({ message: "Member not found" });
    }

    const department = departmentDoc.data() as Omit<DepartmentRecord, "id">;
    const existingMembers = Array.isArray(department.members) ? department.members : [];
    const existingIndex = existingMembers.findIndex((member) => member.memberId === parsed.data.memberId);

    if (existingIndex >= 0) {
      return res.status(409).json({ message: "Member already exists in this department" });
    }

    const memberData = memberDoc.data() as {
      firstName?: string;
      lastName?: string;
      email?: string;
      imageUrl?: string;
    };

    const now = new Date().toISOString();
    const departmentMember: DepartmentMemberRecord = stripUndefinedFields({
      memberId: parsed.data.memberId,
      role: parsed.data.role,
      status: "active",
      addedAt: now,
      updatedAt: now,
      firstName: memberData.firstName,
      lastName: memberData.lastName,
      email: memberData.email,
      imageUrl: memberData.imageUrl,
    });

    const members = [...existingMembers, departmentMember];

    await departmentRef.update({
      members,
      updatedAt: now,
    });

    const updatedDoc = await departmentRef.get();

    return res.status(200).json({
      id: updatedDoc.id,
      ...(updatedDoc.data() as Omit<DepartmentRecord, "id">),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to add member to department",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function removeDepartmentMember(req: Request, res: Response) {
  if (!ensureFirebaseConfigured(res)) return;

  const { id, memberId } = req.params;
  if (!id) return res.status(400).json({ message: "Department id is required" });
  if (!memberId) return res.status(400).json({ message: "Member id is required" });

  try {
    const departmentRef = db!.collection(DEPARTMENTS_COLLECTION).doc(id);
    const departmentDoc = await departmentRef.get();

    if (!departmentDoc.exists) {
      return res.status(404).json({ message: "Department not found" });
    }

    const department = departmentDoc.data() as Omit<DepartmentRecord, "id">;
    const existingMembers = Array.isArray(department.members) ? department.members : [];
    const members = existingMembers.filter((member) => member.memberId !== memberId);

    if (members.length === existingMembers.length) {
      return res.status(404).json({ message: "Member not found in department" });
    }

    await departmentRef.update({
      members,
      updatedAt: new Date().toISOString(),
    });

    const updatedDoc = await departmentRef.get();
    return res.status(200).json({
      id: updatedDoc.id,
      ...(updatedDoc.data() as Omit<DepartmentRecord, "id">),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to remove member from department",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function suspendDepartmentMember(req: Request, res: Response) {
  if (!ensureFirebaseConfigured(res)) return;

  const { id, memberId } = req.params;
  if (!id) return res.status(400).json({ message: "Department id is required" });
  if (!memberId) return res.status(400).json({ message: "Member id is required" });

  const parsed = suspendDepartmentMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid suspend payload",
      errors: parsed.error.flatten(),
    });
  }

  try {
    const departmentRef = db!.collection(DEPARTMENTS_COLLECTION).doc(id);
    const departmentDoc = await departmentRef.get();

    if (!departmentDoc.exists) {
      return res.status(404).json({ message: "Department not found" });
    }

    const now = new Date().toISOString();
    const department = departmentDoc.data() as Omit<DepartmentRecord, "id">;
    const existingMembers = Array.isArray(department.members) ? department.members : [];
    const memberIndex = existingMembers.findIndex((member) => member.memberId === memberId);

    if (memberIndex < 0) {
      return res.status(404).json({ message: "Member not found in department" });
    }

    const members = [...existingMembers];
    members[memberIndex] = stripUndefinedFields({
      ...members[memberIndex],
      status: "suspended",
      suspendedAt: now,
      suspendedReason: parsed.data.reason,
      updatedAt: now,
    });

    await departmentRef.update({
      members,
      updatedAt: now,
    });

    const updatedDoc = await departmentRef.get();
    return res.status(200).json({
      id: updatedDoc.id,
      ...(updatedDoc.data() as Omit<DepartmentRecord, "id">),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to suspend department member",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}