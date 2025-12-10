import express from "express";
import ReviewController from "../../controllers/reviews.controller.js";
import ReviewService from "../../services/review.service.js";
import Review from "../../models/Reviews.js";
import TeacherProfile from "../../models/users/TeacherProfile.js";
import Course from "../../models/Course.js";
import auth from "../../middlewares/auth.middleware.js";
import validate from "../../middlewares/validate.middleware.js";
import { CreateReviewSchema, UpdateReviewSchema } from "../../validation/review.validation.js";

const router = express.Router();

//middlewares
const { authenticate, authorize } = auth;


const reviewService = new ReviewService({ model: Review, courseModel: Course, teacherProfileModel: TeacherProfile });
const reviewController = new ReviewController({ reviewService });

// ..................................Protected routes.......................................
router.post("/", authenticate, validate(CreateReviewSchema), reviewController.addReview);
router.patch("/:reviewId", authenticate, validate(UpdateReviewSchema), reviewController.updateReview);

//.............................only admin can delete review................................
router.delete("/:reviewId", authenticate, authorize("admin"), reviewController.deleteReview);

// ..................................Public routes...................................
router.get("/:targetId", reviewController.getReviewsByTarget);

export { router as reviewRouter };
