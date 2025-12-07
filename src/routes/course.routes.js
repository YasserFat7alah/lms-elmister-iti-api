import express from "express";
import multerMiddleware from "../middlewares/multer.middleware.js";
import auth from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { createCourseSchema, updateCourseSchema } from "../validation/course.validation.js";
import courseController from "../controllers/course.controller.js";

const router = express.Router();

//middlewares
const { authenticate, authorize } = auth;
const uploadThumbnail = multerMiddleware.single("thumbnail");

/* --- --- --- AUTHENTICATED ROUTES --- --- --- */
router.use(authenticate);
router.get("/", courseController.getAllCourses);
router.get("/:id", courseController.getCourseById);

/* --- --- --- PROTECTED ROUTES --- --- --- */
router.use(authorize("teacher", "admin"));
router.post("/", uploadThumbnail, validate(createCourseSchema), courseController.createCourse);
router.patch("/:id", uploadThumbnail, validate(updateCourseSchema), courseController.updateCourseById);
router.delete("/:id", courseController.deleteCourseById);

export { router as courseRouter };