import { Request, Response } from "express";
import { db, firebaseInitError, firebaseReady } from "../config/firebaseAdmin.js";
import {
  heroBannerPatchSchema,
  heroBannerSchema,
  type HeroBannerPatchInput,
  type HeroBannerRecord,
} from "../schemas/herobanner.schema.js";

const COLLECTION = "heroBanners";

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

function normalizeHeroBannerPayload(payload: HeroBannerPatchInput) {
  return stripUndefinedFields({
    ...payload,
  });
}

export async function fetchHeroBanners(_req: Request, res: Response) {
  if (!ensureFirebaseConfigured(res)) return;

  try {
    const snapshot = await db!
      .collection(COLLECTION)
      .orderBy("sortOrder", "asc")
      .orderBy("createdAt", "asc")
      .get();

    const items: HeroBannerRecord[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<HeroBannerRecord, "id">),
    }));

    return res.status(200).json({
      items,
      total: items.length,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch hero banners",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function addHeroBanner(req: Request, res: Response) {
  if (!ensureFirebaseConfigured(res)) return;

  const parsed = heroBannerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid hero banner payload",
      errors: parsed.error.flatten(),
    });
  }

  const now = new Date().toISOString();
  const payload = {
    ...normalizeHeroBannerPayload(parsed.data),
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = await db!.collection(COLLECTION).add(payload);
    const response: HeroBannerRecord = {
      id: docRef.id,
      ...(payload as Omit<HeroBannerRecord, "id">),
    };
    return res.status(201).json(response);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create hero banner",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function patchHeroBanner(req: Request, res: Response) {
  if (!ensureFirebaseConfigured(res)) return;

  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: "Hero banner id is required" });
  }

  const parsed = heroBannerPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid hero banner payload",
      errors: parsed.error.flatten(),
    });
  }

  const payload = normalizeHeroBannerPayload(parsed.data);
  if (Object.keys(payload).length === 0) {
    return res.status(400).json({ message: "No fields provided for update" });
  }

  try {
    const docRef = db!.collection(COLLECTION).doc(id);
    const existing = await docRef.get();

    if (!existing.exists) {
      return res.status(404).json({ message: "Hero banner not found" });
    }

    await docRef.update({
      ...payload,
      updatedAt: new Date().toISOString(),
    });

    const updatedDoc = await docRef.get();
    const response: HeroBannerRecord = {
      id,
      ...(updatedDoc.data() as Omit<HeroBannerRecord, "id">),
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update hero banner",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
