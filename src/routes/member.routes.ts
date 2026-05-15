import { Router } from "express";
import { addMember, deleteMember, fetchMembers } from "../controllers/member.controller";

export const memberRouter = Router();

memberRouter.post("/", addMember);
memberRouter.get("/", fetchMembers);
memberRouter.delete("/:id", deleteMember);
