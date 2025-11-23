import ApiError from "../utils/ApiError";

const errorHandler = (err, req, res, next) => {
    if (!(err instanceof ApiError)) {
        console.error('Unhandled Error:', err);
        err = ApiError.internal(err.message || 'Internal server error');
    }
    const statusCode = err.status || 500;
    const env = process.env.NODE_ENV || 'development';
    const message= err.message || 'Something went wrong'


    console.log(`Error on ${req.method} ${req.originalUrl}: ${err.message}`);

    if (env === 'development') {
        console.log(err.stack);
    }

    res.status(statusCode).json({
        success: false,
        status: statusCode,
        message: message
    });
}

export default errorHandler;