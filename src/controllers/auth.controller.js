import AppError from "../utils/app.error.js";
import asyncHandler from "express-async-handler";
import authService from "../services/auth.service.js";
import mailService from "../services/mail.service.js";
import { CLIENT_URL, COOKIE_SETTINGS } from "../utils/constants.js";


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
        this.authService.setRefreshCookie(res, refreshToken);

        //response with user and access token (body) >> maybe needs refactoring later
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: this.authService.sanitize(user),
            accessToken,
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
            user: this.authService.sanitize(user),
            accessToken,
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
        const oldRefreshToken = req.cookies?.refreshToken;
        if (!oldRefreshToken) {
            throw AppError.unauthorized('Refresh token not found');
        }

        const { accessToken, refreshToken: newRefreshToken, user } = await this.authService.refreshTokens(oldRefreshToken);

        this.authService.setRefreshCookie(res, newRefreshToken);
        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            user,
            accessToken,
        });
    });

    /* --- --- --- OAUTH CONTROLLERS --- --- --- */
    
    /** Google OAuth callback
     * @route GET /api/v1/auth/google/callback
     * @access Public
     */
    googleCallback = asyncHandler(async (req, res) => {
        const user = req.user;
        const fallbackURL = req.query.fallbackUrl || `${CLIENT_URL}/auth/login?error=oauth_failed`;
        
        if (!user) {
            return res.redirect(fallbackURL);
        }

        const { accessToken, refreshToken } = await this.authService.handleOauthLogin(user);
        this.authService.setRefreshCookie(res, refreshToken);

        // Redirect to frontend with token (or use a different approach)
        const redirectUrl = `${CLIENT_URL || 'http://localhost:3000'}/auth/callback?token=${accessToken}`;
        res.redirect(redirectUrl);
    });

    /** Link OAuth provider to existing account
     * @route POST /api/v1/auth/link-provider
     * @access Private
     */
    linkProvider = asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const { provider, providerId } = req.body;

        if (!provider || !providerId) {
            throw AppError.badRequest('Provider and providerId are required');
        }

        const user = await this.authService.linkOAuthProvider(userId, provider, providerId);

        res.status(200).json({
            success: true,
            message: `${provider} account linked successfully`,
            user,
        });
    });

    /** Unlink OAuth provider from account
     * @route POST /api/v1/auth/unlink-provider
     * @access Private
     */
    unlinkProvider = asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const { provider } = req.body;

        if (!provider) {
            throw AppError.badRequest('Provider is required');
        }

        const user = await this.authService.unlinkOAuthProvider(userId, provider);

        res.status(200).json({
            success: true,
            message: `${provider} account unlinked successfully`,
            user,
        });
    });

    /** Complete user profile
     * @route POST /api/v1/auth/complete-profile
     * @access Private
     */
    completeProfile = asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const data = req.body;

        // Get allowed fields for profile completion
        const allowedFields = [
            'name',
            'phone',
            'role',
            'gradeLevel',
            'specialization',
            'age',
            'parentId',
        ];

        const updateData = {};
        for (const key of allowedFields) {
            if (data[key] !== undefined) {
                updateData[key] = data[key];
            }
        }

        const user = await this.authService.updateById(userId, updateData);

        res.status(200).json({
            success: true,
            message: 'Profile completed successfully',
            user: this.authService.sanitize(user),
        });
    });

    /* --- --- --- EMAIL VERIFICATION --- --- --- */

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
        user: this.authService.sanitize(user) });
    });

    /** Resend verification
     * @route POST /api/v1/auth/resend-verification
     * @access Public (rate-limited)
     */
    resendVerification = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) throw AppError.badRequest('Email is required');

    const user = await this.authService.findOne({email}, '+emailVerified');
    if (!user) throw AppError.notFound('User not found');
    if (user.emailVerified) return res.status(400).json({ success:false, message: 'Email already verified' });

    const token = await this.authService.generateToken(user._id);
    await this.mailService.sendVerificationEmail(email, { name: user.name, token });

    res.status(200).json({ success:true, message: 'Verification email sent' });
    });  

}

export default new AuthController(authService, mailService);