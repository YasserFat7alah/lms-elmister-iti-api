import AppError from "../utils/app.error.js";
import asyncHandler from "express-async-handler";
import authService from "../services/auth.service.js";
import { COOKIE_SETTINGS, IS_PRODUCTION, JWT_REFRESH_EXPIRE } from "../utils/constants.js";


class AuthController {

/* --- --- --- AUTH CONTROLLER --- --- --- */    

    /** Register a new user
     * @route POST /api/v1/auth/register
     * @access Public
     */
    register = asyncHandler(async (req, res) => {
        const data = req.body;
        if (!data) throw AppError.badRequest('Request body is missing');

        const { accessToken, refreshToken, user } = await authService.register(data);

        //  Set the  REFRESH TOKEN in cookie
        this.setRefreshCookie(res, refreshToken);

        //response with user and access token (body) >> maybe needs refactoring later
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: { user, accessToken },
        });
    });

    /** Login a user
     * @route POST /api/v1/auth/login
     * @access Public
     */
    login = asyncHandler(async (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) {
            throw AppError.badRequest('Email and password are required');
        }

        const { accessToken, refreshToken, user } = await authService.login(email, password);
        this.setRefreshCookie(res, refreshToken);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: { user, accessToken },
        });
    });

    /** Logout a user by clearing the refresh token cookie
     * @route POST /api/v1/auth/logout
     * @access Public
     */
    logout = asyncHandler(async (req, res) => {
        res.clearCookie('refreshToken', COOKIE_SETTINGS);

        res.status(200).json({
            message: 'Logged out successfully',
        });
    });

    /** Forgot password - initiate password reset
     * @route POST /api/v1/auth/forgot-password
     * @access Public
     */
    forgotPassword = asyncHandler(async (req, res) => {
        const { email } = req.body;
        if (!email) {
            throw AppError.badRequest('Email is required');
        }
        await mailService.initiatePasswordReset(email);

        res.status(200).json({
            success: true,
            message: 'Password reset initiated. Please check your email for further instructions.',
        });
    });

    refreshToken = asyncHandler(async (req, res) => {
        const oldRefreshToken = req.cookies.refreshToken;
        if (!oldRefreshToken) {
            throw AppError.unauthorized('Refresh token not found');
        }

        const { accessToken, refreshToken: newRefreshToken, user } = await authService.refreshTokens(oldRefreshToken);

        this.setRefreshCookie(res, newRefreshToken);
        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            data: { user, accessToken },
        });
    });

/* --- --- --- HELPERS --- --- --- */

    /** Set the refresh token cookie with appropriate options 
     * @param {object} res - The Express response object
     * @param {string} refreshToken - The refresh token to set in the cookie
    */
    setRefreshCookie(res, refreshToken) {
        res.cookie('refreshToken', refreshToken, COOKIE_SETTINGS);
    }

}

export default new AuthController();