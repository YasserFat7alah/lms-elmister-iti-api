import asyncHandler from "express-async-handler";
import Testimonials from "../models/Testimonials.js";
import AppError from "../utils/app.error.js";

class TestimonialController {
    constructor(testimonialService) {
        this.testimonialService = testimonialService;
    }

    /**
       * Create a new testimonial >> (User)
       * @route POST /api/v1/testimonials
       */
    createTestimonials = asyncHandler(async (req, res) => {
        const { message, rating } = req.body;

        if (!message) throw AppError.badRequest("Message is required");
        if (!rating) throw AppError.badRequest("Rating is required");

        const testimonial = await this.testimonialService.createTestimonial({
            user: req.user?._id,
            name: req.user?.name,
            message,
            rating,
        });

        res.status(201).json({
            success: true,
            data: testimonial
        });
    });

    /**
     *  Get approved + featured testimonials only >> (Public)
     * @route GET /api/v1/testimonials/public
     */
    getPublicTestimonials = asyncHandler(async (req, res) => {
        const testimonials = await this.testimonialService.getPublicTestimonials();

        res.status(200).json({
            success: true,
            results: testimonials.length,
            data: testimonials
        });
    });

    /**
     * Get all testimonials >> (Admin)
     * @route GET /api/v1/testimonials
     */
    getAllTestimonials = asyncHandler(async (req, res) => {
        const testimonials = await this.testimonialService.getAllTestimonials();


        res.status(200).json({
            success: true,
            results: testimonials.length,
            data: testimonials
        });
    });

    /**
 * update Testimonial Status (Approve||Feature) >>(Admin)
 * @route PATCH /api/v1/testimonials/:id/
 */
    updateTestimonialStatus = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { isApproved, isFeatured } = req.body;

        const testimonial = await this.testimonialService.updateStatus(id, { isApproved, isFeatured, });

        res.json({
            success: true,
            message: "Testimonial status updated successfully",
            data: testimonial
        });
    });


    /**
     * Delete Testimonial >>(Admin)
     * @route DELETE /api/v1/testimonials/:id
     */
    deleteTestimonial = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const result =await this.testimonialService.deleteTestimonial(id);

        res.json({
            success: true,
            ...result //Success message
        });
    });

}

export default TestimonialController;