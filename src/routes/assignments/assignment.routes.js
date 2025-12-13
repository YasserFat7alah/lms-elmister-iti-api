import express from "express";
import AssignmentController from "../../controllers/assignments/assignment.controller.js";
import AssignmentService from "../../services/assignments/assignment.service.js";
import Assignment from "../../models/assignments/Assignment.js";
import auth from "../../middlewares/auth.middleware.js";
import validate from "../../middlewares/validate.middleware.js";
import { assignmentSchema } from "../../validation/assignments/assignment.validation.js";
import multer from "../../middlewares/multer.middleware.js";
import isEnrolled from "../../middlewares/isEnrolled.middleware.js";

const router = express.Router();

// Middlewares
const upload = multer.single('document'); 
const { authenticate, authorize } = auth;

// Instances
const assignmentService = new AssignmentService(Assignment);
const assignmentController = new AssignmentController(assignmentService);

// Protected routes
router.use(authenticate);

// ===================== Student routes =====================
router.get("/my-assignments", assignmentController.getStudentAssignments);

// ===================== Static routes for group & lesson =====================
router.get("/group/:groupId", isEnrolled(), assignmentController.getAssignmentsByGroup);
router.get("/lesson/:lessonId", isEnrolled(), assignmentController.getAssignmentsByLesson);

// ===================== Assignment CRUD (Teacher) =====================
// Create assignment
router.post("/", authorize("teacher"), upload, validate(assignmentSchema), assignmentController.createAssignment);

// Update assignment (must be before dynamic :assignmentId)
router.put("/:assignmentId", authorize("teacher"), upload, assignmentController.updateAssignment);

// Delete assignment (must be before dynamic :assignmentId)
router.delete("/:assignmentId", authorize("teacher"), assignmentController.deleteAssignment);

// Get single assignment (keep this last!)
router.get("/:assignmentId", isEnrolled(), assignmentController.getAssignmentById);

export { router as assignmentRouter };