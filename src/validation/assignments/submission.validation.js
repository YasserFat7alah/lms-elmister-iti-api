import joi from "joi";

export const submissionSchema = joi.object({
    assignment: joi.string(),
    content: joi.string(),
    answers: joi.array().items(joi.object({
        questionId: joi.string().required(),
        answer: joi.alternatives().try(joi.string().allow(''), joi.number()).required()
    })).optional()
}).unknown(true);

export const gradeSchema = joi.object({
    grade: joi.number().min(0).required(),
    feedback: joi.string(),
});