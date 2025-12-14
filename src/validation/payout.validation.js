import joi from "joi";

export const payoutRequestSchema = joi.object({
    amount: joi.number().min(10).required().messages({
        'number.min': 'Minimum payout amount is 10'
    }),
    note: joi.string().optional().allow(''),
});
