import { Router } from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import dashboardController from "../controllers/dashboard.controller.js";

const router = Router();
const { authenticate, authorize } = authMiddleware;

router.get(
  "/teacher",
  authenticate,
  authorize("teacher"),
  dashboardController.teacherDashboard
);

router.get(
  "/student",
  authenticate,
  authorize("student"),
  dashboardController.studentDashboard
);

router.get(
  "/parent",
  authenticate,
  authorize("parent"),
  dashboardController.parentDashboard
);

router.get(
  "/admin",
  authenticate,
  authorize("admin"),
  dashboardController.adminDashboard
);

export { router as dashboardRouter };

