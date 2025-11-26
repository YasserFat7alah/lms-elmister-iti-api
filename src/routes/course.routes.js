import express from "express";
import multerMiddleware from "../middlewares/multer.middleware";
import courseController from "../controllers/course.controller";

const coursesRouter = express.Router();
const uploadThumbnail = multerMiddleware.single("thumbnail");


coursesRouter.route("/")
    .post(uploadThumbnail, courseController.create) // CREATE COURSE
    .get(courseController.getAll);                  // GET ALL COURSES

coursesRouter.route("/:id")
    .get(courseController.getById)                 // GET COURSE BY ID
    .put(courseController.update)                  // UPDATE COURSE
    .delete(courseController.delete);              // DELETE COURSE

export default coursesRouter;
