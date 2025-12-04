import Joi from "joi";

const weekDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const createGroupSchema = Joi.object({
    title: Joi.string().max(150).min(5).required().messages({
        'string.empty': 'Title is required',
        'any.required': 'Title is required',
        'string.min': 'Title must be between 5 and 150 characters',
        'string.max': 'Title must be between 5 and 150 characters',
    }),
    description: Joi.string().max(500),
    type: Joi.string().valid('online', 'offline', 'hybrid').required(),

    isFree: Joi.boolean().default(false),
    price: Joi.number().min(0)
        .when('isFree', {
            is: false,
            then: Joi.required(),
        }),

    startingDate: Joi.date().required(),
    startingTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),


    schedule: Joi.array().items(Joi.object({
        day: Joi.string().valid(...weekDays).required().messages({
            'string.empty': 'Day is required',
            'any.required': 'Day is required',
            'string.valid': `Day must be one of ${weekDays.join(', ')}`,
        }),
        time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required().messages({
            'string.empty': 'Time is required',
            'any.required': 'Time is required',
            'string.pattern.base': 'Time must be in HH:MM format',
        }),
    })).optional(),
    minStudents: Joi.number().min(1).default(1),
    capacity: Joi.number().min(1).required(),
    studentsCount: Joi.number().default(0),
    status: Joi.string().valid('open', 'closed').default('open'),

    location: Joi.string().when('type', {
        is: 'offline' || 'hybrid',
        then: Joi.required(),
    }),

    link: Joi.string().when('type', {
        is: 'online',
        then: Joi.required(),
    }),

    courseId: Joi.string().required(),
    students: Joi.array().items(Joi.string()),

})

export const updateGroupSchema = Joi.object({
    title: Joi.string().max(150).min(5).messages({
        'string.empty': 'Title cannot be empty',
        'string.min': 'Title must be between 5 and 150 characters',
        'string.max': 'Title must be between 5 and 150 characters',
    }),
    description: Joi.string().max(500),
    type: Joi.string().valid('online', 'offline', 'hybrid'),

    isFree: Joi.boolean(),
    price: Joi.number().min(0).when('isFree', {
        is: false,
        then: Joi.required(),
    }),

    startingDate: Joi.date(),
    startingTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).messages({
        'string.pattern.base': 'Time must be in HH:MM format',
    }),

    schedule: Joi.array().items(Joi.object({
        day: Joi.string().valid(...weekDays).messages({
            'string.valid': `Day must be one of ${weekDays.join(', ')}`,
        }),
        time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).messages({
            'string.pattern.base': 'Time must be in HH:MM format',
        }),
    })),

    minStudents: Joi.number().min(1).default(1),
    capacity: Joi.number().min(1),
    studentsCount: Joi.number().min(0),
    status: Joi.string().valid('open', 'closed'),

    location: Joi.string().when('type', {
        is: 'offline' || 'hybrid',
        then: Joi.required(),
    }),
    link: Joi.string().when('type', {
        is: 'online',
        then: Joi.required(),
    }),

    courseId: Joi.string(),
    students: Joi.array().items(Joi.string()),
});