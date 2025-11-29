

class AppError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(message = 'Bad request') {
        return new AppError(400, message);
    }

    static internal(message = 'Internal server error') {
        return new AppError(500, message);
    }

    static forbidden(message = 'Forbidden') {
        return new AppError(403, message);
    }

    static notFound(message = 'Not found') {
        return new AppError(404, message);
    }

    static conflict(message = 'Conflict') {
        return new AppError(409, message);
    }

    static unauthorized(message = 'Unauthorized') {
        return new AppError(401, message);
    }
}

export default AppError;