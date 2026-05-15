import { Router } from "express";
import { fetchStats } from "../controllers/stats.controller.js";

export const statsRouter = Router();

statsRouter.get("/", fetchStats);
