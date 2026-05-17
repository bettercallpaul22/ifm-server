import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  FIREBASE_CLIENT_EMAIL: z.string().min(1).optional(),
  FIREBASE_PRIVATE_KEY: z.string().min(1).optional(),
  FIREBASE_STORAGE_BUCKET: z.string().min(1).optional(),
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  CLOUDINARY_UPLOAD_FOLDER: z.string().min(1).optional(),
  CORS_ORIGINS: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
const envData = parsed.success ? parsed.data : envSchema.parse({});

if (!parsed.success) {
  // Never crash the serverless runtime because of malformed optional env values.
  console.error("Invalid environment variables detected. Falling back to safe defaults.", parsed.error.flatten());
}

const hasFirebaseAdminConfig = Boolean(
  envData.FIREBASE_PROJECT_ID && envData.FIREBASE_CLIENT_EMAIL && envData.FIREBASE_PRIVATE_KEY,
);
const hasCloudinaryConfig = Boolean(
  envData.CLOUDINARY_CLOUD_NAME && envData.CLOUDINARY_API_KEY && envData.CLOUDINARY_API_SECRET,
);

const fallbackOrigins = [
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
  "http://localhost:8082",
  "https://sacred-spaces-app.vercel.app",
  "https://www.intimatefaithministry.org",
  "https://intimatefaithministry.org"
];

const configuredOrigins = envData.CORS_ORIGINS
  ? envData.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
  : fallbackOrigins;

export const env = {
  ...envData,
  CORS_ORIGINS: configuredOrigins,
  hasFirebaseAdminConfig,
  hasCloudinaryConfig,
};
