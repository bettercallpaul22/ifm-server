import { z } from "zod";

export const mediaTypeSchema = z.enum(["image", "audio", "file"]);

export const mediaRecordSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(180),
  authorName: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  mediaType: mediaTypeSchema,
  url: z.string().trim().url().max(2048),
  publicId: z.string().trim().min(1).max(300),
  resourceType: z.enum(["image", "video", "raw"]),
  format: z.string().trim().min(1).max(40).optional(),
  bytes: z.number().int().nonnegative().optional(),
  originalFileName: z.string().trim().min(1).max(260),
  mimeType: z.string().trim().min(1).max(160),
  createdAt: z.string().trim().datetime({ offset: true }).or(z.string().trim().datetime()),
  updatedAt: z.string().trim().datetime({ offset: true }).or(z.string().trim().datetime()),
});

export type MediaType = z.infer<typeof mediaTypeSchema>;

export type MediaRecord = {
  id: string;
  title: string;
  authorName: string;
  description?: string;
  mediaType: MediaType;
  url: string;
  publicId: string;
  resourceType: "image" | "video" | "raw";
  format?: string;
  bytes?: number;
  originalFileName: string;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
};
