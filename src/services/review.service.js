import AppError from "../utils/app.error.js";
import Review from "../models/Reviews.js";
import BaseService from "./base.service.js";

export class ReviewService extends BaseService {
    constructor({ model, courseService }) {
        super( model );
        this.courseService = courseService;
    }


    /**
     * Creates a new review
     * @param {string} userId - The ID of the user who is creating the review
     * @param {string} courseId - The ID of the course being reviewed
     * @param {number} rating - The rating of the review
     * @param {string} comment - The comment of the review
     * @throws {badRequest} If the user has already reviewed the course
     * @returns {Promise<Review>} The newly created review
     */
    async createReview(userId, courseId, rating, comment) {
        // Prevent duplicate review by same user
        const existing = await this.model.findOne({ user: userId, course: courseId });
        if (existing) {
            throw AppError.badRequest("You have already reviewed this course");
        }

        const review = await super.create({
            user: userId,
            course: courseId,
            rating,
            comment,
        });

        // Incrementally update course rating
        const course = await this.courseService.findById(courseId);
        course.averageRating =
            (course.averageRating * course.ratingsCount + rating) / (course.ratingsCount + 1);
        course.ratingsCount += 1;
        await course.save();

        return review;
    }


    /**
     * Updates a review by ID.
     * Checks if the user is the owner of the review before updating.
     * Updates the course averageRating after updating the review.
     * @param {string} reviewId - The ID of the review to update
     * @param {string} userId - The ID of the user updating the review
     * @param {number} rating - The new rating of the review
     * @param {string} comment - The new comment of the review
     * @throws {Forbidden} You can only update your own reviews
     * @returns {Promise<Review>} The updated review
     */
    async updateReview(reviewId, userId, rating, comment) {
        const review = await super.findById(reviewId);
        if (!review) throw AppError.notFound("Review not found");
        // Prevent user from updating another user's review
        if (review.user.toString() !== userId.toString()) throw AppError.forbidden("Not allowed");

        const oldRating = review.rating;
        review.rating = rating ?? review.rating;
        review.comment = comment ?? review.comment;
        await review.save();

        // Update course averageRating
        const course = await this.courseService.findById(review.course);
        course.averageRating =
            (course.averageRating * course.ratingsCount - oldRating + rating) / course.ratingsCount;
        await course.save();

        return review;
    }

    /** Delete a review */
    async deleteReview(reviewId, userId) {
        const review = await super.findById(reviewId);
        if (!review) throw AppError.notFound("Review not found");
        // Prevent user from deleting another user's review
        if (review.user.toString() !== userId.toString()) throw AppError.forbidden("Not allowed");

        const deletedRating = review.rating;
        const course = await this.courseService.findById(review.course);
        await super.deleteById(reviewId);

        // Update course averageRating
        if (course.ratingsCount > 1) {
            course.averageRating =
                (course.averageRating * course.ratingsCount - deletedRating) / (course.ratingsCount - 1);
            course.ratingsCount -= 1;
        } else {
            course.averageRating = 0;
            course.ratingsCount = 0;
        }

        await course.save();
        return { message: "Review deleted successfully" };
    }



    /**
     * Retrieves all reviews for a given course ID
     * @param {string} courseId - The ID of the course to retrieve reviews for
     * @returns {Promise<Review[]>} An array of review objects
     */
    async getReviewsByCourse(courseId) {
        return this.model.find({ course: courseId }).populate("course", "title").populate("user", "name email");
    }
}

export default ReviewService;
