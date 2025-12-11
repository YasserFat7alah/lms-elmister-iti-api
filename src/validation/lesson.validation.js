import Joi from "joi";

const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const createLessonSchema = Joi.object({
    groupId: Joi.string().required().messages({
        'any.required': 'Group ID is required'
    }),
    title: Joi.string().required().min(3).max(150).messages({
        'string.min': 'Title must be at least 3 characters',
    }),
    description: Joi.string().max(500).allow('').optional(), 
    date: Joi.date().iso().messages({
        'date.format': 'Date must be a valid ISO date'
    }).optional(), 
    
    startTime: Joi.string().pattern(timePattern).messages({
        'string.pattern.base': 'Start time must be in HH:MM format (e.g., 14:30)'
    }).optional(),
    
    endTime: Joi.string().pattern(timePattern).messages({
        'string.pattern.base': 'End time must be in HH:MM format'
    }).optional(),

    type: Joi.string().valid('video', 'document', 'online', 'offline').default('offline'),
    
    location: Joi.string().max(200).allow('').optional(), 
    meetingLink: Joi.string().uri().allow('').optional(), 

    order: Joi.number().min(0).optional(), 
    
    status: Joi.string().valid('draft', 'published', 'archived', 'completed', 'cancelled').default('published'),
});

export const updateLessonSchema = Joi.object({
    groupId: Joi.string(), 
    title: Joi.string().min(3).max(150),
    description: Joi.string().max(500).allow(''),

    date: Joi.date().iso(),
    startTime: Joi.string().pattern(timePattern),
    endTime: Joi.string().pattern(timePattern),

    type: Joi.string().valid('video', 'document', 'online', 'offline'),
    location: Joi.string().allow(''),
    meetingLink: Joi.string().uri().allow(''),

    order: Joi.number().min(0),
    status: Joi.string().valid('draft', 'published', 'archived', 'completed', 'cancelled'),
});