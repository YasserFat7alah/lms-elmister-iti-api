import joi from "joi";

export const userUpdateSchema = joi.object({
    name: joi.string().min(2).max(50).optional(),
    phone: joi.string().optional(),
    address: joi.string().max(200).optional(),
    avatar: joi.object({
        url: joi.string().uri().optional(),
        publicId: joi.string().optional(),
        type: joi.string().optional()
    }).optional()
});
