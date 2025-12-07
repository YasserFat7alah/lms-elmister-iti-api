import joi from "joi";

export const teacherProfileSchema = joi.object({
    specialization: joi.string().required(),
    bio: joi.string().max(500).optional(),
    experienceYears: joi.number().min(0).optional(),
    qualifications: joi.array().items(joi.string()).optional()
});
