import joi from "joi";

const questionSchema = joi.object({
    text: joi.string().min(3).max(500).required(),
    type: joi.string().valid('mcq', 'true-false', 'short-answer').required(),
    options: joi.array().items(joi.string()).min(2).when('type', {
        is: 'mcq',
        then: joi.required(),
        otherwise: joi.optional()
    }),
    correctAnswer: joi.alternatives().try(
        joi.string(),
        joi.boolean()
    ).required(),
    points: joi.number().min(1).max(100).required()
});

export const quizSchema = joi.object({
    title: joi.string().min(3).max(200).required(),
    description: joi.string().allow('').optional(),
    group: joi.string().required(),
    questions: joi.array().items(questionSchema).min(1).required(),
    dueDate: joi.date().min('now').required(),
    duration: joi.number().min(1).optional(), // in minutes
    status: joi.string().valid('active', 'draft', 'archived').optional()
});

export const submitQuizSchema = joi.object({
    answers: joi.array().items(
        joi.object({
            questionId: joi.string().required(),
            answer: joi.alternatives().try(
                joi.string(),
                joi.boolean()
            ).required()
        })
    ).min(1).required()
});

export const gradeSubmissionSchema = joi.object({
    additionalScore: joi.number().optional(),
    feedback: joi.string().allow('').optional()
});
