import { Router } from "express";
import {
  addMemberToDepartment,
  createDepartment,
  fetchDepartmentById,
  fetchDepartments,
  removeDepartmentMember,
  suspendDepartmentMember,
} from "../controllers/department.controller.js";

export const departmentRouter = Router();

departmentRouter.get("/", fetchDepartments);
departmentRouter.post("/", createDepartment);
departmentRouter.get("/:id", fetchDepartmentById);
departmentRouter.post("/:id/members", addMemberToDepartment);
departmentRouter.delete("/:id/members/:memberId", removeDepartmentMember);
departmentRouter.patch("/:id/members/:memberId/suspend", suspendDepartmentMember);