import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/app.error.js';
import BaseService from './base.service.js';
import { JWT_ACCESS_EXPIRE, JWT_REFRESH_EXPIRE, JWT_SECRET } from '../utils/constants.js';

class AuthService extends BaseService {
    constructor() {
        super(User);
    }

    generateAccessToken(userId) {
        return jwt.sign({ id: userId }, JWT_SECRET, {
            expiresIn: JWT_ACCESS_EXPIRE,
        });
    }

    generateRefreshToken(userId) {
        return jwt.sign({ id: userId }, JWT_SECRET, {
            expiresIn: JWT_REFRESH_EXPIRE,
        });
    }

    generateTokens(userId) {
        return {
            accessToken: this.generateAccessToken(userId),
            refreshToken: this.generateRefreshToken(userId),
        };
    }

    verifyRefreshToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch {
            throw AppError.unauthorized('Invalid or expired refresh token');
        }
    }

    async register(userData) {
        const { email } = userData;
        // Check if user exists
        const existingUser = await this.model.findOne({ email });
        if (existingUser) {
            throw AppError.conflict('Email already in use.');
        }
        const allowedFields = [
            "name",
            "email",
            "password",
            "age",
            "role",
            "gradeLevel",
            "parentId",
            "specialization",
            "phone",
        ];
        const data = {};
        for (const key of allowedFields) {
            if (userData[key] !== undefined) {
                data[key] = userData[key];
            }
        }
        //create user
        const newUser = await this.create(data);
        //generate tokens
        const { accessToken, refreshToken } = this.generateTokens(newUser._id);

        return {
            user: this.sanitize(newUser),
            accessToken,
            refreshToken
        };
    }

    async login(email, password) {
        const user = await this.model.findOne({ email }).select('+password');
        if (!user) {
            throw AppError.unauthorized('Invalid email or password.');
        }

        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            throw AppError.unauthorized('Invalid email or password.');
        }
        const { accessToken, refreshToken } = this.generateTokens(user._id);
        return {
            user: this.sanitize(user),
            accessToken,
            refreshToken
        };
    }
    async refreshTokens(refreshToken) {
        const decoded = this.verifyRefreshToken(refreshToken);
        const user = await this.findById(decoded.id);
        if (!user) throw AppError.unauthorized('User not found');

        const tokens = this.generateTokens(user._id);
        return {
            user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        };
    }
}


export default new AuthService(User);