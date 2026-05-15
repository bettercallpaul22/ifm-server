import { Request, Response } from "express";
import { db, firebaseInitError, firebaseReady } from "../config/firebaseAdmin.js";
import { memberSchema, type MemberRecord } from "../schemas/member.schema.js";

const COLLECTION = "members";

function ensureFirebaseConfigured(res: Response) {
  if (firebaseReady && db && !firebaseInitError) return true;

  res.status(503).json({
    message:
      "Firebase Admin is not ready. Provide FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY in server/.env or place a valid service account file at server/intimate_service_acc.json.",
    details: firebaseInitError || "Missing Firebase Admin configuration.",
  });
  return false;
}

function normalizeOptionalDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function stripUndefinedFields<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as T;
}

export async function addMember(req: Request, res: Response) {
  if (!ensureFirebaseConfigured(res)) return;

  const parsed = memberSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid member payload",
      errors: parsed.error.flatten(),
    });
  }

  const now = new Date().toISOString();
  const payload = stripUndefinedFields({
    ...parsed.data,
    dateOfBirth: normalizeOptionalDate(parsed.data.dateOfBirth),
    createdAt: now,
    updatedAt: now,
  });

  try {
    const docRef = await db!.collection(COLLECTION).add(payload);

    const response: MemberRecord = {
      id: docRef.id,
      ...payload,
    };

    return res.status(201).json(response);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to add member",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function fetchMembers(_req: Request, res: Response) {
  if (!ensureFirebaseConfigured(res)) return;

  try {
    const pageParam = Number.parseInt(String(_req.query.page ?? "1"), 10);
    const limitParam = Number.parseInt(String(_req.query.limit ?? "10"), 10);
    const rawQuery = String(_req.query.q ?? "").trim().toLowerCase();

    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;
    const snapshot = await db!.collection(COLLECTION).orderBy("createdAt", "desc").get();

    const allMembers: MemberRecord[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<MemberRecord, "id">),
    }));

    const filteredMembers = rawQuery
      ? allMembers.filter((member) => {
          const haystack = [
            member.firstName,
            member.lastName,
            member.email,
            member.phone,
            member.gender,
            member.membershipStatus,
            member.country,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(rawQuery);
        })
      : allMembers;

    const total = filteredMembers.length;
    const offset = (page - 1) * limit;
    const members = filteredMembers.slice(offset, offset + limit);

    return res.status(200).json({
      items: members,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      query: rawQuery,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch members",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function deleteMember(req: Request, res: Response) {
  if (!ensureFirebaseConfigured(res)) return;

  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Member id is required" });
  }

  try {
    const docRef = db!.collection(COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Member not found" });
    }

    await docRef.delete();
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete member",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
