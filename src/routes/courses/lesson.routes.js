import express from "express";
import LessonController from "../../controllers/lessons.controller.js";
import LessonService from "../../services/lesson.service.js";
import Group from "../../models/Group.js";
import Lesson from "../../models/Lesson.js";
import validate from "../../middlewares/validate.middleware.js";
import auth from "../../middlewares/auth.middleware.js";
import { createLessonSchema, updateLessonSchema } from "../../validation/lesson.validation.js";
import multerMiddleware from "../../middlewares/multer.middleware.js";

const router = express.Router();

//middlewares
const { authenticate, authorize } = auth;
const uploadFiles = multerMiddleware.fields([
    { name: "video"},
    { name: "document"}
]);

//instances
const lessonService = new LessonService(Lesson,Group);
const lessonController = new LessonController(lessonService)

/*---------------------------- routes (all routes are protected)----------------------------*/
router.use(authenticate);

//create lesson
router.post("/", authorize("teacher", "admin"),uploadFiles, validate(createLessonSchema), lessonController.createLesson);

//getlessons by group (all lessons inside a specific group)
router.get("/group/:groupId", lessonController.getLessonsByGroup);

//update a lesson
router.patch("/:id", authorize("teacher", "admin"),uploadFiles, validate(updateLessonSchema), lessonController.updateLesson);

//delete a lesson and its content
router.delete("/:id", authorize("teacher", "admin"), lessonController.deleteLesson);
// Delete video from a lesson
router.delete("/:id/video", authorize("teacher", "admin"), lessonController.deleteVideo);
// Delete document[] from a lesson
router.delete("/:id/document/:docId", authorize("teacher", "admin"), lessonController.deleteDocument);

//reorder lessons
router.patch("/reorder/:groupId", authorize("teacher", "admin"), lessonController.reorderLessons);

export { router as lessonRouter };