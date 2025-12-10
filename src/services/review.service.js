import AppError from "../utils/app.error.js";
import Review from "../models/Reviews.js";
import mongoose from "mongoose";
import BaseService from "./base.service.js";

export class ReviewService extends BaseService {
    constructor({ model, courseModel, teacherProfileModel }) {
        super(model);
        this.courseModel = courseModel;
        this.teacherProfileModel = teacherProfileModel;
    }

    /**
     * Helper to get the correct model based on target type
     * @param {string} targetModel 
     */
    getModel(targetModel) {
        if (targetModel === 'Course') return this.courseModel;
        if (targetModel === 'User') return this.teacherProfileModel; // Ratings strictly go to TeacherProfile
        throw AppError.badRequest("Invalid review target");
    }

    /**
     * Internal helper to update target's average rating
     */
    async updateTargetRating(targetId, targetModel) {
        const Model = this.getModel(targetModel);

        // Find if target exists (TeacherProfile is linked by 'user' field, Course by '_id')
        const query = targetModel === 'User' ? { user: targetId } : { _id: targetId };
        const target = await Model.findOne(query);

        if (!target) return; // Should likely log this error

        // Aggregation to calculate new average
        const stats = await this.model.aggregate([
            {
                $match: { target: new mongoose.Types.ObjectId(targetId), targetModel }
            },
            {
                $group: {
                    _id: null,
                    avgRating: { $avg: "$rating" },
                    nRatings: { $sum: 1 }
                }
            }
        ]);

        if (stats.length > 0) {
            target.averageRating = stats[0].avgRating;
            target.totalRatings = stats[0].nRatings; // Renamed from ratingsCount to match TeacherProfile standard if needed, or unify
            // Note: Course uses `ratingsCount`, TeacherProfile uses `totalRatings`.
            // We need to handle this discrepancy.
            if (targetModel === 'Course') target.ratingsCount = stats[0].nRatings;
            // For TeacherProfile it is totalRatings
        } else {
            target.averageRating = 0;
            if (targetModel === 'Course') target.ratingsCount = 0;
            else target.totalRatings = 0;
        }

        await target.save();
    }

    /**
     * Creates a new review
     */
    async createReview(userId, targetId, targetModel, rating, comment) {
        // Prevent duplicate
        const existing = await this.model.findOne({ user: userId, target: targetId, targetModel });
        if (existing) {
            throw AppError.badRequest(`You have already reviewed this ${targetModel}`);
        }

        const review = await super.create({
            user: userId,
            target: targetId,
            targetModel,
            rating,
            comment,
        });

        await this.updateTargetRating(targetId, targetModel);

        return review;
    }

    /**
     * Updates a review
     */
    async updateReview(reviewId, userId, rating, comment) {
        const review = await super.findById(reviewId);
        if (!review) throw AppError.notFound("Review not found");
        if (review.user.toString() !== userId.toString()) throw AppError.forbidden("Not allowed");

        review.rating = rating ?? review.rating;
        review.comment = comment ?? review.comment;
        await review.save();

        await this.updateTargetRating(review.target, review.targetModel);

        return review;
    }

    /** Delete a review */
    async deleteReview(reviewId, userId) {
        const review = await super.findById(reviewId);
        if (!review) throw AppError.notFound("Review not found");
        if (review.user.toString() !== userId.toString()) throw AppError.forbidden("Not allowed");

        const { target, targetModel } = review;
        await super.deleteById(reviewId);

        await this.updateTargetRating(target, targetModel);
        return { message: "Review deleted successfully" };
    }

    /**
     * Retrieves reviews for a target
     */
    async getReviewsByTarget(targetId, targetModel) {
        return this.model.find({ target: targetId, targetModel })
            .populate("user", "name email avatar")
            .sort("-createdAt");
    }
}

export default ReviewService;
