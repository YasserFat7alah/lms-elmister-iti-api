import jwt from 'jsonwebtoken';
import bycrypt from 'bcrypt';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import BaseService from './base.service.js';

class AuthService extends BaseService {
    constructor() {
        super(User);
    }

    generateAccessToken(userId) {
        return jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
            expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m',
        });
    }

    generateRefreshToken(userId) {
        return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
            expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
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
            return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        } catch {
            throw ApiError.unauthorized('Invalid or expired refresh token');
        }
    }

    async register(email, password, role) {
        // Check if user exists
        const existingUser = await this.findOne({ email });
        if (existingUser) {
            throw ApiError.conflict('Email already in use.');
        }

        //create user
        const newUser = await this.create({ email, password, role });
        //generate tokens
        const { accessToken, refreshToken } = this.generateTokens(newUser._id);

        return {
            user: this.sanitizeUser(newUser),
            accessToken,
            refreshToken
        };
    }

    async login(email, password) {
        const user = await this.model.findOne({ email }).select('+password');
        if (!user) {
            throw ApiError.unauthorized('Invalid email or password.');
        }

        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            throw ApiError.unauthorized('Invalid email or password.');
        }
        const { accessToken, refreshToken } = this.generateTokens(user._id);
        return {
            user: this.sanitizeUser(user),
            accessToken,
            refreshToken
        };
    }
    async refreshTokens(refreshToken) {
        const decoded = this.verifyRefreshToken(refreshToken);
        const user = await this.findById(decoded.id);
        if (!user) throw ApiError.unauthorized('User not found');

        const tokens = this.generateTokens(user._id);
        return {
            user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        };
    }
        sanitizeUser(user) {
        const obj = user.toObject ? user.toObject() : user;
        const { password, __v, _id,...safe } = obj;
        return { id: _id, ...safe };
    }
}


export default new AuthService(User);