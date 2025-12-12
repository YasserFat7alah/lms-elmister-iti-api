import express from "express";
import courseController from "../controllers/course.controller.js";
import userController from "../controllers/user.controller.js";


const router = express.Router();

/* --- --- --- COURSE ROUTES --- --- --- */
router.get("/courses", courseController.getPublicCourses);
router.get("/courses/:id", courseController.getCourseById);

/* --- --- --- TEACHER ROUTES --- --- --- */
router.get("/teachers", userController.getPublicTeachers);
router.get("/users/:username", userController.getUserByUsername);


export { router as publicRouter };