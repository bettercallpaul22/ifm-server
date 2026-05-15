import { Router } from "express";
import { addHeroBanner, fetchHeroBanners, patchHeroBanner } from "../controllers/herobanner.controller.js";

export const heroBannerRouter = Router();

heroBannerRouter.get("/", fetchHeroBanners);
heroBannerRouter.post("/", addHeroBanner);
heroBannerRouter.patch("/:id", patchHeroBanner);
