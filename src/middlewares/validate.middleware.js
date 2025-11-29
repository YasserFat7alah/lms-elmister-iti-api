import AppError from "../utils/app.error.js";


const validate = (schema, prop = 'body') => {
    return (req, res, next) => {
        const { error } = schema.validate(req[prop], { abortEarly: false });
        if (error) {
            const details = error.details.map(detail => detail.message).join(', ');
            return next(AppError.badRequest(details));
        }
        next();
    };
};

export default validate;