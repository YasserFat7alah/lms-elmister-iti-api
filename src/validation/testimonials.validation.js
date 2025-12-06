import joi from "joi";

export const testimonialSchema = joi.object({
    message: joi.string().required(),
    rating: joi.number().required().min(1).max(5).messages({
        'string.empty': 'Rating is required',
        'any.required': 'Rating is required',
        'number.min': 'Rating must be between 1 and 5',
        'number.max': 'Rating must be between 1 and 5',
    }),
    isApproved: joi.boolean().default(false),
    isFeatured: joi.boolean().default(false),
})

export const updateTestimonialSchema = joi.object({
    isApproved: joi.boolean(),
    isFeatured: joi.boolean(),
})