import joi from "joi";

export const adminUpdateUserSchema = joi.object({
    role: joi.string().valid('teacher', 'parent', 'student', 'admin').optional(),
    block: joi.boolean().optional(),
    emailVerified: joi.boolean().optional()
});
