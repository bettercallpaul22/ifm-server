import { Request, Response } from "express";
import { db, firebaseInitError, firebaseReady } from "../config/firebaseAdmin.js";

const MEMBERS_COLLECTION = "members";
const DEPARTMENTS_COLLECTION = "departments";
const PROGRAMS_COLLECTION = "programs";

type MembershipStatus = "pending" | "active" | "inactive";

type DepartmentMember = {
  memberId: string;
  status?: "active" | "suspended";
};

type DepartmentDoc = {
  members?: DepartmentMember[];
};

function ensureFirebaseConfigured(res: Response) {
  if (firebaseReady && db && !firebaseInitError) return true;

  res.status(503).json({
    message:
      "Firebase Admin is not ready. Provide FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY in server/.env.",
    details: firebaseInitError || "Missing Firebase Admin configuration.",
  });
  return false;
}

function normalizeMembershipStatus(value: unknown): MembershipStatus {
  if (value === "active" || value === "inactive") return value;
  return "pending";
}

export async function fetchStats(_req: Request, res: Response) {
  if (!ensureFirebaseConfigured(res)) return;

  try {
    const [membersSnapshot, departmentsSnapshot, programsSnapshot] = await Promise.all([
      db!.collection(MEMBERS_COLLECTION).get(),
      db!.collection(DEPARTMENTS_COLLECTION).get(),
      db!.collection(PROGRAMS_COLLECTION).get(),
    ]);

    const membership = {
      active: 0,
      pending: 0,
      inactive: 0,
    };

    for (const doc of membersSnapshot.docs) {
      const status = normalizeMembershipStatus(doc.data().membershipStatus);
      membership[status] += 1;
    }

    let departmentAssignedMembers = 0;
    let departmentActiveMembers = 0;
    let departmentSuspendedMembers = 0;

    for (const doc of departmentsSnapshot.docs) {
      const data = doc.data() as DepartmentDoc;
      const members = Array.isArray(data.members) ? data.members : [];

      departmentAssignedMembers += members.length;

      for (const member of members) {
        if (member.status === "suspended") {
          departmentSuspendedMembers += 1;
        } else {
          departmentActiveMembers += 1;
        }
      }
    }

    return res.status(200).json({
      members: {
        total: membersSnapshot.size,
        ...membership,
      },
      departments: {
        total: departmentsSnapshot.size,
        assignedMembers: departmentAssignedMembers,
        activeMembers: departmentActiveMembers,
        suspendedMembers: departmentSuspendedMembers,
      },
      programs: {
        total: programsSnapshot.size,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch stats",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
