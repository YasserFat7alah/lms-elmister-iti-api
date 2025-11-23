import joi from "joi";

export const registerValidation = joi.object({
    username: joi.string().required(),
    email: joi.string().email().required(),
    password: joi.string().required(),
    age: joi.number().required(),
    gradeLevel: joi.string().required(),
    role: joi.string().required() //student, teacher, admin, parent, guest (needs modification)
})

//login
export const loginValidation = joi.object({
    email: joi.string().email().required(),
    password: joi.string().required()
})