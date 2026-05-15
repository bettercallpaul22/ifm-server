import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_PRIVATE_KEY: z.string().min(1).optional(),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().min(1).optional(),
  FIREBASE_STORAGE_BUCKET: z.string().min(1).optional(),
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  CLOUDINARY_UPLOAD_FOLDER: z.string().min(1).optional(),
  CORS_ORIGINS: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

const hasFirebaseAdminConfig = Boolean(
  parsed.data.FIREBASE_PROJECT_ID && parsed.data.FIREBASE_CLIENT_EMAIL && parsed.data.FIREBASE_PRIVATE_KEY,
);
const hasCloudinaryConfig = Boolean(
  parsed.data.CLOUDINARY_CLOUD_NAME && parsed.data.CLOUDINARY_API_KEY && parsed.data.CLOUDINARY_API_SECRET,
);

const fallbackOrigins = [
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:3000",
  "http://localhost:8082",
  "https://sacred-spaces-app.vercel.app",
];

const configuredOrigins = parsed.data.CORS_ORIGINS
  ? parsed.data.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
  : fallbackOrigins;

export const env = {
  ...parsed.data,
  CORS_ORIGINS: configuredOrigins,
  hasFirebaseAdminConfig,
  hasCloudinaryConfig,
};
