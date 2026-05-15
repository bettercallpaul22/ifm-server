import { Router } from "express";
import { fetchStats } from "../controllers/stats.controller";

export const statsRouter = Router();

statsRouter.get("/", fetchStats);
