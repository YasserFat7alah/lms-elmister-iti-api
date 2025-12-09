import express from "express";
import courseController from "../../controllers/course.controller.js";
import auth from "../../middlewares/auth.middleware.js";
import validate from "../../middlewares/validate.middleware.js";
import { createCourseSchema, updateCourseSchema } from '../../validation/course.validation.js';



const router = express.Router();

//middlewares
const { authenticate, authorize } = auth;

/* --- --- --- AUTHENTICATED ROUTES --- --- --- */
router.use(authenticate);
router.get("/", courseController.getAllCourses);
router.get("/:id", courseController.getCourseById);

/* --- --- --- PROTECTED ROUTES --- --- --- */
router.use(authorize("teacher", "admin"));
router.post("/", validate(createCourseSchema), courseController.createCourse);
router.patch("/:id", validate(updateCourseSchema), courseController.updateCourseById);
router.delete("/:id", courseController.deleteCourseById);

export { router as courseRouter };