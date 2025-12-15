import express from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import validate from "../../middlewares/validate.middleware.js";
import { enrollSchema } from './../../validation/enrollment.validation.js';
import enrollmentController from "../../controllers/enrollment.controller.js";

const router = express.Router();

const { authenticate, authorize } = authMiddleware;

router.use(authenticate);


// Admin: Get all enrollments
router.get("/", authorize("admin"), enrollmentController.getAll);

// Admin: Delete enrollment
router.delete("/admin/:enrollmentId", authorize("admin"), enrollmentController.adminDelete);

// Admin: Update status
router.patch("/:enrollmentId/status", authorize("admin"), enrollmentController.updateStatus);

router.post("/checkout/:groupId", authorize("parent"), validate(enrollSchema),
  enrollmentController.enroll
);

router.get("/me", authorize("parent", "student"), enrollmentController.listMine);

// Get enrollments for a specific student (parent viewing their child's enrollments)
router.get("/student/:studentId", authorize("parent"), enrollmentController.getByStudent);

router.delete(
  "/:enrollmentId",
  authorize("parent"),
  enrollmentController.cancel
);

router.patch(
  "/:enrollmentId/renew",
  authorize("parent"),
  enrollmentController.renew
);

export { router as enrollmentRouter };


