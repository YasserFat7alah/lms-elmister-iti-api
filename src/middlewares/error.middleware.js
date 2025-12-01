import AppError from "../utils/app.error.js";
import { IS_PRODUCTION } from "../utils/constants.js";

const errorHandler = (err, req, res, next) => {
    if (!(err instanceof AppError)) {
        console.error('Unhandled Error:', err);
        err = AppError.internal(err.message || 'Internal server error');
    }
    const statusCode = err.status || 500;
    const message= err.message || 'Something went wrong'


    console.log(`Error on ${req.method} ${req.originalUrl}: ${err.message}`);

    if (!IS_PRODUCTION) {
        console.log(err.stack);
    }

    res.status(statusCode).json({
        success: false,
        status: statusCode,
        message: message
    });
}

export default errorHandler;