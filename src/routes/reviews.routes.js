import express from "express";
import ReviewController from "../controllers/reviews.controller.js";
import ReviewService from "../services/review.service.js";
import Review from "../models/Reviews.js";
import CourseService from "../services/course.service.js";
import Course from "../models/Course.js";
import auth from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import { CreateReviewSchema, UpdateReviewSchema } from "../validation/review.validation.js";

const router = express.Router();

//middlewares
const { authenticate, authorize } = auth;

//instances
const courseService = new CourseService(Course);
const reviewService = new ReviewService({ model: Review, courseService});
const reviewController = new ReviewController({ reviewService });

// ..................................Protected routes.......................................
router.post("/", authenticate, validate(CreateReviewSchema), reviewController.addReview);
router.patch("/:reviewId", authenticate, validate(UpdateReviewSchema), reviewController.updateReview);

//.............................only admin||student||parent can delete review................................
router.delete("/:reviewId", authenticate, authorize("admin", "student","parent"), reviewController.deleteReview);

// ..................................Public routes...................................
router.get("/:courseId", reviewController.getReviewsByCourse);

export  { router as reviewRouter };
