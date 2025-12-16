import express from "express";
import QuizController from "../../controllers/assignments/quiz.controller.js";
import QuizService from "../../services/assignments/quiz.service.js";
import Quiz from "../../models/assignments/Quiz.js";
import auth from "../../middlewares/auth.middleware.js";
import isEnrolled from "../../middlewares/isEnrolled.middleware.js";

const router = express.Router();

const { authenticate, authorize } = auth;

const quizService = new QuizService(Quiz);
const quizController = new QuizController(quizService);

router.use(authenticate);

// ===================== Student Routes =====================
router.get("/my-quizzes", authorize("student"), quizController.getStudentQuizzes);
router.get("/my-submissions", authorize("student"), quizController.getMySubmissions);
router.post("/:quizId/submit", authorize("student"), isEnrolled(), quizController.submitQuiz);

// ===================== Parent Routes =====================
router.get("/student/:studentId", authorize("parent"), quizController.getChildQuizzes);

// ===================== Teacher Routes =====================
router.post("/", authorize("teacher"), quizController.createQuiz);
router.get("/teacher/my-quizzes", authorize("teacher"), quizController.getTeacherQuizzes);
router.get("/:quizId/submissions", authorize("teacher"), quizController.getQuizSubmissions);
router.patch("/submission/:submissionId/grade", authorize("teacher"), quizController.gradeSubmission);

// ===================== Shared / Common Routes =====================
router.get("/group/:groupId", isEnrolled(), quizController.getQuizzesByGroup);
router.get("/submission/:submissionId", isEnrolled(), quizController.getSubmissionById);
router.get("/:quizId", isEnrolled(), quizController.getQuizById);


export { router as quizRouter };
