import joi from "joi";

export const assignmentSchema = joi.object({
    title: joi.string().min(5).max(150).required(),
    description: joi.string(),

    group: joi.string().optional(),
    lesson: joi.string().optional(),

    course: joi.string().required(),
    teacher: joi.string().required(),

    totalGrade: joi.number().min(1).max(100).default(100).messages({
        "number.min": "Total grade must be between 1 and 100",
        "number.max": "Total grade must be between 1 and 100",
    }),
    dueDate: joi.date().greater('now').required().messages({
        "date.greater": "Due date must be in the future",
    }),
    
}).or("group", "lesson");