import joi from "joi";

//register
export const registerSchema = joi.object({
    name: joi.string().required().messages({
        'string.empty': 'Name is required',
        'any.required': 'Name is required'
    }),
    email: joi.string().email().required().messages({
        'string.empty': 'Email is required',
        'any.required': 'Email is required'
    }),
    password: joi.string().required().min(8).messages({
        'string.empty': 'Password is required',
        'any.required': 'Password is required',
        'string.min': 'Password must be at least 8 characters long'
    }),
    age: joi.number().required().min(5).max(80).messages({
        'string.empty': 'Age is required',
        'any.required': 'Age is required',
        'number.min': 'Age must be at least 5 years old',
        'number.max': 'Age must be less than 80 years old'
    }),
    role: joi.string().required().valid('teacher', 'parent', 'student').messages({
        'string.empty': 'Role is required',
        'any.required': 'Role is required',
        'string.valid': 'Role must be teacher, parent, or student'
    }),
    gradeLevel: joi.string().optional().valid('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'),
    phone: joi.string().optional(),
    specialization: joi.string().optional(),
    parentId: joi.string().optional(),
})

//login
export const loginSchema = joi.object({
    email: joi.string().email().required().messages({
        'string.empty': 'Email is required',
        'any.required': 'Email is required'
    }),
    password: joi.string().required().min(8).messages({
        'string.empty': 'Password is required',
        'any.required': 'Password is required',
        'string.min': 'Password must be at least 8 characters long'
    })
})