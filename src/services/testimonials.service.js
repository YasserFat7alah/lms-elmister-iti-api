import Testimonials from "../models/Testimonials.js";
import AppError from "../utils/app.error.js";
import BaseService from "./base.service.js";

class TestimonialService extends BaseService {
    constructor(model) {
        super(model);
    }
    /**
     * Creates a new testimonial.
     * @param {Object} data - The testimonial data.
     * @throws {AppError} If the user has already created a testimonial today.
     * @returns {Promise<Testimonials>} The newly created testimonial.
     */
    async createTestimonial(data) {
        const { user } = data;

        // set today date range
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // check if user has already created a testimonial today
        const existing = await this.model.findOne({
            user: user,
            createdAt: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });

        if (existing) {
            throw AppError.badRequest("You can only submit one testimonial per day.");
        }
        return await super.create(data);
    }


    /**
     * Retrieves all public testimonials (approved and featured).
     * @returns {Promise<Testimonials[]>} An array of public testimonial objects.
     */
    async getPublicTestimonials() {
        return await this.model
            .find({ isApproved: true, isFeatured: true })
            .populate("user", "name avatar")
            .sort("-createdAt");
    }


    /**
     * Retrieves all testimonials.
     * @returns {Promise<Testimonials[]>} An array of testimonial objects.
     */
    async getAllTestimonials() {
        return await this.model
            .find()
            .populate("user", "name email avatar")
            .sort("-createdAt");
    }




    /**
     * Updates the status of a testimonial (isApproved | isFeatured)
     * @param {string} id - The ID of the testimonial to update.
     * @param {Object} data - The status data to update.
     * @returns {Promise<Testimonials>} The updated testimonial object.
     */
    async updateStatus(id, { isApproved, isFeatured }) {
        const testimonial = await this.findById(id);

        if (isApproved !== undefined) testimonial.approved = isApproved;
        if (isFeatured !== undefined) testimonial.featured = isFeatured;

        await testimonial.save();

        return testimonial;
    }


    /**
     * Deletes a testimonial by ID.
     * @param {string} id - The ID of the testimonial to delete.
     * @returns {Promise<Testimonials>} The deleted testimonial object.
     */

    async deleteTestimonial(id) {
        await super.deleteById(id);
        return { message: "Testimonial deleted successfully" }
    }
}

export default TestimonialService;