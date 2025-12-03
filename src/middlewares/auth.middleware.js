import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../models/users/User.js';
import AppError from '../utils/app.error.js';
import { JWT_SECRET } from '../utils/constants.js';

export class AuthMW {
    
    /** Authenticate user by verifying JWT token
     * @param {object} req - Express request object
     * @param {object} res - Express response object
     * @param {function} next - Express next middleware function
     */
    authenticate = asyncHandler(async (req, res, next) => {
        let token = null;

        if (req.cookies && req.cookies.refreshToken) {
            token = req.cookies.accessToken;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else {
            token = req.headers.authorization;
        } 

        if (!token) {
            res.status(401);
            throw AppError.unauthorized('Not authorized, no token provided');
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
            next();
        } catch (error) {
            res.status(401);
            throw AppError.unauthorized('Not authorized, token failed');
        }
    })

    /** protect routes based on user roles
     * @param  {...string} roles - Allowed roles
     * @returns {function} Middleware function
     */
    authorize = (...roles) => {
        return (req, res, next) => {
            if (!roles.includes(req.user.role)) {
                res.status(403);
                return next(AppError.forbidden(`Access denied: Requires ${roles.join(' or ')} role`));
            }
            next();
        };
    };

    /** Set rate limiting middleware
     * @param {number} limit - The time window in minutes
     * @param {number} number - The maximum number of requests allowed
     * @returns {function} The rate limiting middleware
     */
    setTimeLimit = (limit, times) => {
        
        return rateLimit({
            windowMs: limit * 60 * 1000, 
            max: times, 
            message: 'Too many requests from this IP, please try again later.',
        });
    };
}

export default new AuthMW();