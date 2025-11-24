import ApiError from "../utils/ApiError.js";


const validate = (schema, prop = 'body') => {
    return (req, res, next) => {
        const { error } = schema.validate(req[prop], { abortEarly: false });
        if (error) {
            const details = error.details.map(detail => detail.message).join(', ');
            return next(ApiError.badRequest(details));
        }
        next();
    };
};

export default validate;