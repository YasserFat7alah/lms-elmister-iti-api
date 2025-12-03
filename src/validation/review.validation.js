import Joi from "joi";

export const CreateReviewSchema = Joi.object({
    courseId: Joi.string().required(),
    rating: Joi.number().min(1).max(5).required().messages({
        'string.empty': 'Rating is required',
        'any.required': 'Rating is required',
        'number.min': 'Rating must be between 1 and 5',
        'number.max': 'Rating must be between 1 and 5',
    }),
    comment: Joi.string().max(100)
})


export const UpdateReviewSchema = Joi.object({
    rating: Joi.number().min(1).max(5).messages({
        'number.min': 'Rating must be between 1 and 5',
        'number.max': 'Rating must be between 1 and 5',
    }),
    comment: Joi.string().max(100)  
    
})