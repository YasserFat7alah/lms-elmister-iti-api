import Joi from "joi";

/* --- --- --- USER PROFILE UPDATE --- --- --- */

export const updateMeSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).optional().messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name must not exceed 100 characters'
    }),
    username: Joi.string().trim().min(3).max(30).lowercase().pattern(/^[a-z0-9_]+$/).optional().messages({
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username must not exceed 30 characters',
        'string.pattern.base': 'Username can only contain lowercase letters, numbers, and underscores'
    }),
    email: Joi.string().email().trim().lowercase().optional().messages({
        'string.email': 'Please provide a valid email address'
    }),
    phone: Joi.string().trim().pattern(/^[0-9+\-\s()]+$/).optional().messages({
        'string.pattern.base': 'Please provide a valid phone number'
    })
}).min(1)
  .messages({'object.min': 'At least one field must be provided for update'});

