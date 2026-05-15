import { Router } from "express";
import { addProgram, deleteProgram, fetchPrograms, patchProgram } from "../controllers/program.controller.js";

export const programRouter = Router();

programRouter.get("/", fetchPrograms);
programRouter.post("/", addProgram);
programRouter.patch("/:id", patchProgram);
programRouter.delete("/:id", deleteProgram);