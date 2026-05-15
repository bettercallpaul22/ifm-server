import { Request, Response } from "express";
import { type UploadApiResponse } from "cloudinary";
import { cloudinary, cloudinaryInitError, cloudinaryReady } from "../config/cloudinary.js";
import { db, firebaseInitError, firebaseReady } from "../config/firebaseAdmin.js";
import { env } from "../config/env.js";
import { type MediaRecord, type MediaType } from "../schemas/media.schema.js";

const COLLECTION = "media";

function ensureFirebaseConfigured(res: Response) {
  if (firebaseReady && db && !firebaseInitError) return true;

  res.status(503).json({
    message:
      "Firebase Admin is not ready. Provide FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY in server/.env or place a valid service account file at server/intimate_service_acc.json.",
    details: firebaseInitError || "Missing Firebase Admin configuration.",
  });
  return false;
}

function ensureCloudinaryConfigured(res: Response) {
  if (cloudinaryReady && !cloudinaryInitError) return true;

  res.status(503).json({
    message:
      "Cloudinary is not ready. Provide CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET in server/.env.",
    details: cloudinaryInitError || "Missing Cloudinary configuration.",
  });
  return false;
}

function classifyMediaType(mimeType: string): MediaType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
}

function getCloudinaryResourceType(mediaType: MediaType): "image" | "video" | "raw" {
  if (mediaType === "image") return "image";
  if (mediaType === "audio") return "video";
  return "raw";
}

function uploadBufferToCloudinary(
  fileBuffer: Buffer,
  options: {
    resourceType: "image" | "video" | "raw";
    publicId?: string;
  },
) {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: env.CLOUDINARY_UPLOAD_FOLDER || "ifministry/media",
        resource_type: options.resourceType,
        public_id: options.publicId,
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Cloudinary upload did not return a result."));
          return;
        }
        resolve(result);
      },
    );

    stream.end(fileBuffer);
  });
}

function makePublicId(baseName: string) {
  const normalized = baseName
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  const suffix = `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
  return `${normalized || "media-file"}-${suffix}`;
}

export async function fetchMedia(req: Request, res: Response) {
  if (!ensureFirebaseConfigured(res)) return;

  try {
    const typeFilter = String(req.query.type ?? "").trim().toLowerCase();
    const allowedType = typeFilter === "image" || typeFilter === "audio" || typeFilter === "file";
    const rawQuery = String(req.query.q ?? "").trim().toLowerCase();

    const snapshot = await db!.collection(COLLECTION).orderBy("createdAt", "desc").get();

    const allItems: MediaRecord[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<MediaRecord, "id">),
    }));

    const filteredByType = allowedType
      ? allItems.filter((item) => item.mediaType === typeFilter)
      : allItems;

    const items = rawQuery
      ? filteredByType.filter((item) => {
        const haystack = [
            item.title,
            item.authorName,
            item.description,
            item.originalFileName,
            item.mediaType,
            item.mimeType,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(rawQuery);
        })
      : filteredByType;

    return res.status(200).json({
      items,
      total: items.length,
      query: rawQuery,
      type: allowedType ? typeFilter : undefined,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch media",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function uploadMedia(req: Request, res: Response) {
  if (!ensureFirebaseConfigured(res)) return;
  if (!ensureCloudinaryConfigured(res)) return;

  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: "File is required. Submit multipart/form-data with field name 'file'." });
  }

  const mediaType = classifyMediaType(file.mimetype);
  const resourceType = getCloudinaryResourceType(mediaType);
  const now = new Date().toISOString();
  const titleFromBody = String(req.body.title ?? "").trim();
  const authorNameFromBody = String(req.body.authorName ?? "").trim();
  const descriptionFromBody = String(req.body.description ?? "").trim();

  if (!authorNameFromBody) {
    return res.status(400).json({ message: "authorName is required." });
  }

  try {
    const uploadResult = await uploadBufferToCloudinary(file.buffer, {
      resourceType,
      publicId: makePublicId(file.originalname),
    });

    const payload = {
      title: titleFromBody || file.originalname,
      authorName: authorNameFromBody,
      description: descriptionFromBody || undefined,
      mediaType,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      resourceType,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db!.collection(COLLECTION).add(payload);
    const response: MediaRecord = {
      id: docRef.id,
      ...payload,
    };

    return res.status(201).json(response);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to upload media",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
