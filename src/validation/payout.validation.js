import joi from "joi";

export const payoutRequestSchema = joi.object({
    amount: joi.number().min(10).required().messages({
        'number.min': 'Minimum payout amount is 10'
    }),
    method: joi.string().valid('bank_transfer', 'paypal').required(),
    details: joi.object().required() // specific details depend on method, keeping generic for now or can specify
});
