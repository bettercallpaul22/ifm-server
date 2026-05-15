import { Request, Response } from "express";
import { db, firebaseInitError, firebaseReady } from "../config/firebaseAdmin.js";
import {
  programPatchSchema,
  programSchema,
  type ProgramPatchInput,
  type ProgramRecord,
} from "../schemas/program.schema.js";

const COLLECTION = "programs";

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

function normalizeProgramPayload(payload: ProgramPatchInput) {
  return stripUndefinedFields({
    ...payload,
    startDate: normalizeOptionalDate(payload.startDate),
    endDate: normalizeOptionalDate(payload.endDate),
  });
}

export async function fetchPrograms(req: Request, res: Response) {
  if (!ensureFirebaseConfigured(res)) return;

  try {
    const pageParam = Number.parseInt(String(req.query.page ?? "1"), 10);
    const limitParam = Number.parseInt(String(req.query.limit ?? "10"), 10);
    const rawQuery = String(req.query.q ?? "").trim().toLowerCase();

    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;

    const snapshot = await db!.collection(COLLECTION).orderBy("createdAt", "desc").get();

    const allPrograms: ProgramRecord[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<ProgramRecord, "id">),
    }));

    const filteredPrograms = rawQuery
      ? allPrograms.filter((program) => {
          const haystack = [
            program.title,
            program.description,
            program.location,
            program.category,
            program.status,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(rawQuery);
        })
      : allPrograms;

    const total = filteredPrograms.length;
    const offset = (page - 1) * limit;
    const items = filteredPrograms.slice(offset, offset + limit);

    return res.status(200).json({
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      query: rawQuery,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch programs",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function addProgram(req: Request, res: Response) {
  if (!ensureFirebaseConfigured(res)) return;

  const parsed = programSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid program payload",
      errors: parsed.error.flatten(),
    });
  }

  const now = new Date().toISOString();
  const payload = {
    ...normalizeProgramPayload(parsed.data),
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = await db!.collection(COLLECTION).add(payload);
    const response: ProgramRecord = {
      id: docRef.id,
      ...(payload as Omit<ProgramRecord, "id">),
    };
    return res.status(201).json(response);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create program",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function patchProgram(req: Request, res: Response) {
  if (!ensureFirebaseConfigured(res)) return;

  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: "Program id is required" });
  }

  const parsed = programPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid program payload",
      errors: parsed.error.flatten(),
    });
  }

  const payload = normalizeProgramPayload(parsed.data);
  if (Object.keys(payload).length === 0) {
    return res.status(400).json({ message: "No fields provided for update" });
  }

  try {
    const docRef = db!.collection(COLLECTION).doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return res.status(404).json({ message: "Program not found" });
    }

    await docRef.update({
      ...payload,
      updatedAt: new Date().toISOString(),
    });

    const updatedDoc = await docRef.get();
    const response: ProgramRecord = {
      id,
      ...(updatedDoc.data() as Omit<ProgramRecord, "id">),
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update program",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function deleteProgram(req: Request, res: Response) {
  if (!ensureFirebaseConfigured(res)) return;

  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Program id is required" });
  }

  try {
    const docRef = db!.collection(COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: "Program not found" });
    }

    await docRef.delete();
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete program",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}