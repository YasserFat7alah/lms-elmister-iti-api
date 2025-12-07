import joi from "joi";

export const enrollSchema = joi.object({
    studentId: joi.string().required().messages({
        'any.required': 'Student ID is required'
    }),
});
