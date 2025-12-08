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
//.............................................Middlewares......................................
const upload = multer.single('document'); 
const { authenticate, authorize } = auth;

//.............................................Instances.........................................
const assignmentService = new AssignmentService(Assignment);
const assignmentController = new AssignmentController(assignmentService);

//..................................Protected routes.................................
router.use(authenticate);

// Create a new assignment
router.post("/",authorize("teacher"), upload, validate(assignmentSchema), assignmentController.createAssignment);

// Get all assignments by group
router.get("/group/:groupId",isEnrolled(), assignmentController.getAssignmentsByGroup);

// Get all assignments by lesson
router.get("/lesson/:lessonId",isEnrolled(), assignmentController.getAssignmentsByLesson);

// Get assignment by ID (teacher, student, parent of enrolled child)
router.get("/:assignmentId", isEnrolled(), assignmentController.getAssignmentById);

export { router as assignmentRouter };
