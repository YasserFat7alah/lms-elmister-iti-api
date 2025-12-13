import joi from "joi";

export const assignmentSchema = joi.object({
    title: joi.string().min(5).max(150).required(),
    description: joi.string().allow(""),

    group: joi.string().optional(),
    lesson: joi.string().optional(),
    
    totalGrade: joi.number().min(1).max(100).required(),
    dueDate: joi.date().min('now').required(),

    allowLateSubmission: joi.boolean().required(),

    maxLateDays: joi.when("allowLateSubmission", {
        is: true,
        then: joi.number().min(0).required(),
        otherwise: joi.forbidden()
    }),

    latePenaltyPerDay: joi.when("allowLateSubmission", {
        is: true,
        then: joi.number().min(0).max(100).required(),
        otherwise: joi.forbidden()
    }),

}).or("group", "lesson");

export const updateAssignmentSchema = joi.object({
    title: joi.string().min(5).max(150).optional(),
    description: joi.string().allow("").optional(),
    totalGrade: joi.number().min(1).max(100).optional(),
    dueDate: joi.date().min('now').optional(),
    allowLateSubmission: joi.boolean().optional(),
    maxLateDays: joi.when("allowLateSubmission", {
        is: true,
        then: joi.number().min(0).optional(),
        otherwise: joi.forbidden()
    }),
    latePenaltyPerDay: joi.when("allowLateSubmission", {
        is: true,
        then: joi.number().min(0).max(100).optional(),
        otherwise: joi.forbidden()
    }),
});