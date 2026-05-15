import { v2 as cloudinary } from "cloudinary";
import { env } from "./env";

let cloudinaryInitError: string | null = null;

export const cloudinaryReady = env.hasCloudinaryConfig;

if (cloudinaryReady) {
  try {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown Cloudinary initialization error";
    cloudinaryInitError = `Cloudinary initialization failed: ${reason}`;
  }
}

export { cloudinary, cloudinaryInitError };
