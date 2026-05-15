import { Router } from "express";
import multer from "multer";
import { fetchMedia, uploadMedia } from "../controllers/media.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

export const mediaRouter = Router();

mediaRouter.get("/", fetchMedia);
mediaRouter.post("/upload", upload.single("file"), uploadMedia);
