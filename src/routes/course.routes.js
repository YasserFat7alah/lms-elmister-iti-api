import express from "express";
import CourseController from "../controllers/course.controller.js";
import CourseService from "../services/course.service.js";
import Course from "../models/Course.js";
import multerMiddleware from "../middlewares/multer.middleware.js";
import auth from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { createCourseSchema, updateCourseSchema } from "../validation/course.validation.js";

const router = express.Router();

//middlewares
const { authenticate, authorize } = auth;
const uploadThumbnail = multerMiddleware.single("thumbnail");

//instances
const courseService = new CourseService(Course);
const courseController = new CourseController(courseService);

// ..................................Public routes...................................

router.get("/", courseController.getAllCourses);
router.get("/:id", courseController.getCourseById);

// ..................................Protected routes.................................
router.use(authenticate);

router.post("/", authorize("teacher", "admin"), validate(createCourseSchema), uploadThumbnail, courseController.createCourse);
router.patch("/:id", authorize("teacher", "admin"), validate(updateCourseSchema), uploadThumbnail, courseController.updateCourseById);
router.delete("/:id", authorize("teacher", "admin"), courseController.deleteCourseById);

export { router as courseRouter };