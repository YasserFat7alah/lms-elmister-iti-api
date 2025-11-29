import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/app.error.js';
import BaseService from './base.service.js';
import { JWT_ACCESS_EXPIRE, JWT_REFRESH_EXPIRE, JWT_REFRESH_SECRET, JWT_SECRET } from '../utils/constants.js';

export class AuthService extends BaseService {
    constructor(User) {
        super(User);
    }

    /* --- --- --- JWT --- --- --- */

    /** Generate Access Token
     * @param {string} userId - The ID of the user
     * @param {string} secret - The secret key for signing the token
     * @param {string} expiresIn - The expiration time for the token
     * @returns {string} The generated access token
     */
    generateToken(user, secret = JWT_SECRET, expiresIn = JWT_ACCESS_EXPIRE) {
        return jwt.sign({ id: user._id ,role: user.role }, secret, { expiresIn });
    }

    /** Generate Access and Refresh Tokens
     * @param {string} userId - The ID of the user
     * @returns {object} An object containing the access and refresh tokens
     */
    generateTokens(user) {
        return {
            accessToken: this.generateToken(user, JWT_SECRET, JWT_ACCESS_EXPIRE),
            refreshToken: this.generateToken(user, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRE),
        };
    }

    /** Verify Token
     * @param {string} token - The token to verify
     * @returns {object} The decoded token payload
     * @throws {AppError} If the token is invalid or expired
     */
    verifyToken(token, secret) {
        try {
            return jwt.verify(token, secret);
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
        const newUser = await super.create(data);
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

    /** Change User Password
     * @param {string} userId - The ID of the user
     * @param {string} currentPassword - The current password
     * @param {string} newPassword - The new password
     */
    async changePassword(userId, currentPassword, newPassword) {
        const user = await this.model.findById(userId).select('+password');
        if (!user)  throw AppError.notFound('User not found');

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch)  throw AppError.unauthorized('Current password is incorrect');

        user.password = newPassword;
        await user.save();
    } 

    /** Refresh Access and Refresh Tokens
     * @param {string} refreshToken - The refresh token
     * @returns {object} An object containing the user and new tokens
     */
    async refreshTokens(refreshToken) {
        const decoded = this.verifyToken(refreshToken, JWT_REFRESH_SECRET);
        const user = await this.findById(decoded.id);
        if (!user) throw AppError.unauthorized('User not found');

        const tokens = this.generateTokens(user);
        return {
            user,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        };
    }
}


export default new AuthService(User);