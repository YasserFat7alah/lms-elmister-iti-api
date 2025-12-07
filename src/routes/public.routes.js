import express from "express";
import courseController from "../controllers/course.controller.js";


const router = express.Router();

/* --- --- --- COURSE ROUTES --- --- --- */
router.get("/courses", courseController.getAllCourses);
router.get("/courses/:id", courseController.getCourseById);

/* --- --- --- TEACHER ROUTES --- --- --- */
// router.get("/teachers", );
// router.get("/teachers/:id", );


export { router as publicRouter };