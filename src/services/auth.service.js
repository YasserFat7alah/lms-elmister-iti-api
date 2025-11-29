import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/app.error.js';
import BaseService from './base.service.js';
import { JWT_ACCESS_EXPIRE, JWT_REFRESH_EXPIRE, JWT_SECRET } from '../utils/constants.js';

class AuthService extends BaseService {
    constructor(User) {
        super(User);
    }

    /* --- --- --- JWT ACCESS --- --- --- */

    /** Generate Access Token
     * @param {string} userId - The ID of the user
     * @returns {string} The generated access token
     */
    generateAccessToken(userId) {
        return jwt.sign({ id: userId }, JWT_SECRET, {
            expiresIn: JWT_ACCESS_EXPIRE,
        });
    }

    /** Generate Refresh Token
     * @param {string} userId - The ID of the user
     * @returns {string} The generated refresh token
     */
    generateRefreshToken(userId) {
        return jwt.sign({ id: userId }, JWT_SECRET, {
            expiresIn: JWT_REFRESH_EXPIRE,
        });
    }

    /** Generate Access and Refresh Tokens
     * @param {string} userId - The ID of the user
     * @returns {object} An object containing the access and refresh tokens
     */
    generateTokens(userId) {
        return {
            accessToken: this.generateAccessToken(userId),
            refreshToken: this.generateRefreshToken(userId),
        };
    }

    /** Verify Token
     * @param {string} token - The token to verify
     * @returns {object} The decoded token payload
     * @throws {AppError} If the token is invalid or expired
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch {
            throw AppError.unauthorized('Invalid or expired token');
        }
    }

    /* --- --- --- User Registration and Login --- --- --- */

    /** Register a new user
     * @param {object} userData - The user data for registration
     * @returns {object} An object containing the sanitized user and tokens
     */
    async register(userData) {
        const { email } = userData;
        // Check if user exists
        const existingUser = await this.model.findOne({ email });
        if (existingUser) {
            throw AppError.conflict('Email already Registered, try logging in.');
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

    /** Login a user
     * @param {string} email - The user's email
     * @param {string} password - The user's password
     * @returns {object} An object containing the sanitized user and tokens
     */
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

    /** Refresh Access and Refresh Tokens
     * @param {string} refreshToken - The refresh token
     * @returns {object} An object containing the user and new tokens
     */
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