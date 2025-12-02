import express from "express";
import courseController from "../controllers/course.controller.js";
import multerMiddleware from "../middlewares/multer.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { createCourseSchema, updateCourseSchema } from "../validation/course.validation.js";

const coursesRouter = express.Router();
const uploadThumbnail = multerMiddleware.single("thumbnail");


coursesRouter.route("/")
    .post(validate(createCourseSchema), uploadThumbnail, courseController.create)    // CREATE COURSE
    .get(courseController.getAll);                                                  // GET ALL COURSES

coursesRouter.route("/:id")
    .get(courseController.getById)                                                  // GET COURSE BY ID
    .patch(validate(updateCourseSchema), uploadThumbnail, courseController.updateById)// UPDATE COURSE
    .delete(courseController.deleteById);                                           // DELETE COURSE

export default coursesRouter;
