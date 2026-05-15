import express, { Express, Request, Response } from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { departmentRouter } from "./routes/department.routes.js";
import { heroBannerRouter } from "./routes/herobanner.routes.js";
import { mediaRouter } from "./routes/media.routes.js";
import { memberRouter } from "./routes/member.routes.js";
import { programRouter } from "./routes/program.routes.js";
import { statsRouter } from "./routes/stats.routes.js";

export const app: Express = express();
const START_TIME = new Date();

const corsOptions = {
  origin: env.CORS_ORIGINS,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

app.get("/api/health", (req: Request, res: Response) => {
  const uptime = Math.floor((Date.now() - START_TIME.getTime()) / 1000);

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime,
    message: "Sacred Spaces Server is running",
  });
});

app.use("/api/members", memberRouter);
app.use("/api/programs", programRouter);
app.use("/api/departments", departmentRouter);
app.use("/api/stats", statsRouter);
app.use("/api/herobanners", heroBannerRouter);
app.use("/api/media", mediaRouter);
