import Joi from "joi";
import { GRADE_LEVELS } from "../utils/constants.js";

/**
 * Validation schema for creating a child
 */
export const createChildSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required().messages({
        "string.empty": "Name is required",
        "string.min": "Name must be at least 2 characters",
        "string.max": "Name must be at most 100 characters",
        "any.required": "Name is required",
    }),

    email: Joi.string().email().required().messages({
        "string.empty": "Email is required",
        "string.email": "Please provide a valid email address",
        "any.required": "Email is required",
    }),

    password: Joi.string().min(8).required().messages({
        "string.empty": "Password is required",
        "string.min": "Password must be at least 8 characters long",
        "any.required": "Password is required",
    }),

    grade: Joi.string()
        .valid(...GRADE_LEVELS)
        .required()
        .messages({
            "any.only": `Grade must be one of: ${GRADE_LEVELS.join(", ")}`,
            "string.empty": "Grade is required",
            "any.required": "Grade is required",
        }),

    gender: Joi.string().valid("male", "female").optional().messages({
        "any.only": "Gender must be either 'male' or 'female'",
    }),

    phone: Joi.string().trim().optional().allow(null, "").messages({
        "string.empty": "Phone cannot be empty",
    }),

    avatar: Joi.object({
        url: Joi.string().required(),
        publicId: Joi.string().required(),
        type: Joi.string().optional(),
    })
        .optional()
        .allow(null)
        .messages({
            "object.base": "Avatar must be an object with url and publicId",
        }),

    notes: Joi.string().trim().max(500).optional().allow(null, "").messages({
        "string.max": "Notes must be at most 500 characters",
    }),

    approved: Joi.boolean().optional().default(true),
});

/**
 * Validation schema for updating a child
 */
export const updateChildSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).optional().messages({
        "string.min": "Name must be at least 2 characters",
        "string.max": "Name must be at most 100 characters",
    }),

    email: Joi.string().email().optional().messages({
        "string.email": "Please provide a valid email address",
    }),

    password: Joi.string().min(8).optional().messages({
        "string.min": "Password must be at least 8 characters long",
    }),

    grade: Joi.string()
        .valid(...GRADE_LEVELS)
        .optional()
        .messages({
            "any.only": `Grade must be one of: ${GRADE_LEVELS.join(", ")}`,
        }),

    gender: Joi.string().valid("male", "female").optional().messages({
        "any.only": "Gender must be either 'male' or 'female'",
    }),

    phone: Joi.string().trim().optional().allow(null, "").messages({
        "string.empty": "Phone cannot be empty",
    }),

    avatar: Joi.object({
        url: Joi.string().required(),
        publicId: Joi.string().required(),
        type: Joi.string().optional(),
    })
        .optional()
        .allow(null)
        .messages({
            "object.base": "Avatar must be an object with url and publicId",
        }),

    notes: Joi.string().trim().max(500).optional().allow(null, "").messages({
        "string.max": "Notes must be at most 500 characters",
    }),

    approved: Joi.boolean().optional(),
}).min(1).messages({
    "object.min": "At least one field must be provided for update",
});

