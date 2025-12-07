import joi from "joi";

export const studentProfileSchema = joi.object({
    gradeLevel: joi.string().valid('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12').required(),
    schoolName: joi.string().optional(),
    parentId: joi.string().required(),
    interests: joi.array().items(joi.string()).optional()
});
