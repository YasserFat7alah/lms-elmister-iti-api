import Joi from "joi";

export const createLessonSchema = Joi.object({
    title: Joi.string().required().min(5).max(150).messages({
        'string.empty': 'Title is required',
        'any.required': 'Title is required',
        'string.min': 'Title must be between 5 and 150 characters',
        'string.max': 'Title must be between 5 and 150 characters',
    }),
    description: Joi.string().required().max(500),
    type: Joi.string().valid('video', 'document', 'live', 'offline').default('offline'),
    order: Joi.number().required().min(0),
    status: Joi.string().valid('draft', 'published', 'archived').default('draft'),
    groupId: Joi.string().required(),
});

export const updateLessonSchema = Joi.object({
    title: Joi.string().min(5).max(150).messages({
        'string.min': 'Title must be between 5 and 150 characters',
        'string.max': 'Title must be between 5 and 150 characters', 
    }),
    description: Joi.string().max(500),
    type: Joi.string().valid('video', 'document', 'live', 'offline'),
    order: Joi.number().min(0),
    status: Joi.string().valid('draft', 'published', 'archived'),
    groupId: Joi.string(),
})