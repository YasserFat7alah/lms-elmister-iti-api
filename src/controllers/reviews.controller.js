import asyncHandler from "express-async-handler";

export class ReviewController {
    constructor({ reviewService }) {
        this.reviewService = reviewService;
    }

    /** 
     * Add a review 
     * @route POST api/v1/reviews
     * */
    addReview = asyncHandler(async (req, res) => {
        const { targetId, targetModel, rating, comment } = req.body;
        // Default targetModel to 'Course' for backward compatibility if needed, or enforce it
        const model = targetModel || 'Course';

        const review = await this.reviewService.createReview(req.user._id, targetId, model, rating, comment);
        res.status(201).json({
            success: true,
            data: review
        });
    });

    /** 
     * Update a review 
     * @route patch api/v1/reviews/:id
     * */
    updateReview = asyncHandler(async (req, res) => {
        const { reviewId } = req.params;
        const { rating, comment } = req.body;
        const review = await this.reviewService.updateReview(reviewId, req.user._id, rating, comment);
        res.status(200).json({
            success: true,
            data: review
        });
    });


    /** 
     * Delete a review
     * @route DELETE api/v1/reviews/:id
     */
    deleteReview = asyncHandler(async (req, res) => {
        const { reviewId } = req.params;
        const result = await this.reviewService.deleteReview(reviewId, req.user._id);
        res.status(200).json({
            success: true,
            ...result
        });
    });

    /** Get reviews by target 
     * @route GET api/v1/reviews/:targetId
     */
    getReviewsByTarget = asyncHandler(async (req, res) => {
        const { targetId } = req.params;
        const { targetModel } = req.query;
        const model = targetModel || 'Course';

        const reviews = await this.reviewService.getReviewsByTarget(targetId, model);
        res.status(200).json({
            success: true,
            data: reviews
        });
    });
}

export default ReviewController;
