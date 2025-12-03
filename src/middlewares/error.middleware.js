import AppError from "../utils/app.error.js";
import { IS_PRODUCTION } from "../utils/constants.js";

const errorHandler = (err, req, res, next) => {
    
    let error = { ...err };
    error.message = err.message;

    /* --- --- --- MONGOOSE ERRORS --- --- --- */
    // CastError - Invalid ID
    if (err.name === 'CastError') {
        const message = `Invalid ${err.path}: ${err.value}`;
        error = AppError.notFound(message);
    }

    // Duplicate key error
    if (err.code === 11000) {

        const value = err.errmsg ? err.errmsg.match(/(["'])(\\?.)*?\1/)[0] : 'entered value';
        const message = `Duplicate field value: ${value}. Please use another value!`;
        error = AppError.conflict(message);
    }

    // Validation Error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(el => el.message);
        const message = `Invalid input data. ${errors.join('. ')}`;
        error = AppError.badRequest(message);
    }

    /* --- --- --- JWT ERRORS --- --- --- */
    if (err.name === 'JsonWebTokenError') error = AppError.unauthorized('Invalid token.');
    if (err.name === 'TokenExpiredError') error = AppError.unauthorized('Token expired.');

    /* --- --- --- FINAL RESPONSE --- --- --- */
    const statusCode = error.status || 500;
    const message = error.message || 'Something went wrong';

    if (IS_PRODUCTION && statusCode === 500) {
        console.error('ERROR :::', err); 
        return res.status(500).json({
            success: false,
            status: 500,
            message: 'Something went wrong!'
        });
    }

    if(!IS_PRODUCTION) {
        console.log(`Error on ${req.method} ${req.originalUrl}: ${message}`);
        console.log(err);
        
    }

    res.status(statusCode).json({
        success: false,
        status: statusCode,
        message: message,
        stack: IS_PRODUCTION ? null : err.stack
    });
}

export default errorHandler;