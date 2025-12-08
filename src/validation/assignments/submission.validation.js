import joi from "joi";

export const submissionSchema = joi.object({
    assignment: joi.string(),
    content: joi.string(),

})

export const gradeSchema = joi.object({
    grade: joi.number().min(0).required(),
    feedback: joi.string(),
});