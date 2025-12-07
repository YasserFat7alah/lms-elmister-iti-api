import joi from "joi";

export const parentProfileSchema = joi.object({
    children: joi.array().items(joi.string()).optional(),
    phone: joi.string().optional(),
});
