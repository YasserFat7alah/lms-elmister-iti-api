import express from "express";
import QuizController from "../../controllers/quizzes/quiz.controller.js";
import QuizService from "../../services/quizzes/quiz.service.js";
import Quiz from "../../models/quizzes/Quiz.js";
import auth from "../../middlewares/auth.middleware.js";
import validate from "../../middlewares/validate.middleware.js";
import { quizSchema, submitQuizSchema, gradeSubmissionSchema } from "../../validation/quizzes/quiz.validation.js";

const router = express.Router();

// Middlewares
const { authenticate, authorize } = auth;

// Instances
const quizService = new QuizService(Quiz);
const quizController = new QuizController(quizService);

// Protected routes - all quiz routes require authentication
router.use(authenticate);

// ===================== Teacher routes =====================
// Get all quizzes created by teacher
router.get("/my-quizzes", authorize("teacher"), quizController.getTeacherQuizzes);

// Create quiz
router.post("/", authorize("teacher"), validate(quizSchema), quizController.createQuiz);

// Get submissions for a quiz
router.get("/:quizId/submissions", authorize("teacher"), quizController.getQuizSubmissions);

// Grade a submission
router.patch("/submissions/:submissionId/grade", authorize("teacher"), validate(gradeSubmissionSchema), quizController.gradeSubmission);

// ===================== Student routes =====================
// Get all quizzes for student
router.get("/student/my-quizzes", quizController.getStudentQuizzes);

// Get student's submissions
router.get("/my-submissions", quizController.getMyQuizSubmissions);

// Submit quiz
router.post("/:quizId/submit", validate(submitQuizSchema), quizController.submitQuiz);

// ===================== Parent routes =====================
// Get child's submissions
router.get("/student/:studentId/submissions", authorize("parent"), quizController.getChildSubmissions);

// Get child's quizzes (all)
router.get("/student/:studentId/quizzes", authorize("parent"), quizController.getChildQuizzes);

// ===================== Shared routes =====================
// Get quizzes by group
router.get("/group/:groupId", quizController.getQuizzesByGroup);

// Get quiz by ID
router.get("/:quizId", quizController.getQuizById);

// Get submission details
router.get("/submissions/:submissionId", quizController.getSubmissionById);

export { router as quizRouter };
