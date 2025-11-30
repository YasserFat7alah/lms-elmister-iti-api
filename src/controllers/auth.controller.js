import AppError from "../utils/app.error.js";
import asyncHandler from "express-async-handler";
import authService from "../services/auth.service.js";
import mailService from "../services/mail.service.js";
import { COOKIE_SETTINGS } from "../utils/constants.js";


class AuthController {

    constructor(authService, mailService) {
        this.authService = authService;
        this.mailService = mailService;
    }

/* --- --- --- AUTH CONTROLLER --- --- --- */    

    /** Register a new user
     * @route POST /api/v1/auth/register
     * @access Public
     */
    register = asyncHandler(async (req, res) => {
        const data = req.body;
        if (!data) throw AppError.badRequest('Request body is missing');

        const { accessToken, refreshToken, user } = await this.authService.register(data);

        //await this.mailService.sendVerificationEmail(user.email, { name: user.name, token: verificationToken });

        //  Set the  REFRESH TOKEN in cookie
        this.authServicesetRefreshCookie(res, refreshToken);

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

        const { accessToken, refreshToken, user } = await this.authService.login(email, password);
        this.authService.setRefreshCookie(res, refreshToken);

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
        const token = req.cookies?.refreshToken;

        if (token) {
             this.authService.clearRefreshCookie(res);
        }

        res.status(200).json({
            success: true,
            message: 'Logged out successfully',
        });
    });

    /* --- --- --- PASSWORD MANAGEMENT --- --- --- */

    /** Change password for authenticated user
     * @route POST /api/v1/auth/change-password
     * @access Private
     */
    changePassword = asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            throw AppError.badRequest('Current password and new password are required');
        }

        await this.authService.changePassword(userId, currentPassword, newPassword);

        res.status(200).json({
            success: true,
            message: 'Password changed successfully',
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
        const user = await this.authService.findOne({ email }, '+password');
        
        const { otp, otpExpiry } = this.authService.generateOTP(5);

        await this.authService.updateById(user._id, { otp, otpExpiry });
        
        await this.mailService.initiatePasswordReset(email, otp);

        res.status(200).json({
            success: true,
            message: 'Password reset initiated. Please check your email for further instructions.',
        });
    });

    /** reset password using OTP
     * @route POST /api/v1/auth/reset-password
     * @access Public
     */
    resetPassword = asyncHandler(async (req, res) => {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            throw AppError.badRequest('Email, OTP, and new password are required');
        }

        await this.authService.resetPassword(email, otp, newPassword);

        res.status(200).json({
            success: true,
            message: 'Password reset successful',
        });
    });

    /** Refresh access and refresh tokens
     * @route POST /api/v1/auth/refresh-token
     * @access Public
     */
    refreshToken = asyncHandler(async (req, res) => {
        const oldRefreshToken = req.cookies.refreshToken;
        if (!oldRefreshToken) {
            throw AppError.unauthorized('Refresh token not found');
        }

        const { accessToken, refreshToken: newRefreshToken, user } = await this.authService.refreshTokens(oldRefreshToken);

        this.setRefreshCookie(res, newRefreshToken);
        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            data: { user, accessToken },
        });
    });

    /** Verify email
     * @route POST /api/v1/auth/verify-email
     * @access Public
     */
    verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (!token) throw AppError.badRequest('Verification token is required');

    const user = await this.authService.verifyEmailToken(token);

    res.status(200).json({ 
        success:true,
        message: 'Email verified',
        data: { user } });
    });

    /** Resend verification
     * @route POST /api/v1/auth/resend-verification
     * @access Public (rate-limited)
     */
    resendVerification = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) throw AppError.badRequest('Email is required');

    const user = await this.authService.findByEmail(email);
    if (!user) throw AppError.notFound('User not found');
    if (user.isVerified) return res.status(400).json({ success:false, message: 'Email already verified' });

    const token = await this.authService.generateEmailVerificationToken(user._id);
    await this.mailService.sendVerificationEmail(email, { name: user.name, token });

    res.status(200).json({ success:true, message: 'Verification email sent' });
    });  

}

export default new AuthController(authService, mailService);