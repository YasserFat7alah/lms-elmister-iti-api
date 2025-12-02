import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/app.error.js';

class AuthMW {
    protect = asyncHandler(async (req, res, next) => {
        let token;


        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            res.status(401);
            throw AppError.unauthorized('Not authorized, no token');
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            next();
        } catch (error) {
            res.status(401);
            throw AppError.unauthorized('Not authorized, token failed');
        }
    })


    authorize = (...roles) => {
        return (req, res, next) => {
            if (!roles.includes(req.user.role)) {
                res.status(403);
                throw AppError.forbidden(`Access denied: Requires ${roles.join(' or ')} role`);
            }
            next();
        };
    };
}

export default new AuthMW();