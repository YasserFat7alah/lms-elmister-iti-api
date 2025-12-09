import AppError from "../utils/app.error.js";
import asyncHandler from "express-async-handler";
import authService from "../services/auth.service.js";
import mailService from "../services/mail.service.js";
import { CLIENT_URL } from "../utils/constants.js";


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

        // Generate verification token and send email
        const verificationToken = this.authService.generateToken(user);
        const verificationLink = `${CLIENT_URL}/auth/verify-email?token=${verificationToken}`;
        await this.mailService.initiateAccountVerfication(user.email, verificationLink);

        //  Set the  REFRESH TOKEN in cookie
        this.authService.setRefreshCookie(res, refreshToken);
        this.authService.setAccessCookie(res, accessToken);

        //response with user and access token (body) >> maybe needs refactoring later
        res.status(201).json({
            success: true,
            message: 'User registered successfully. Please check your email to verify your account.',
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
        this.authService.setAccessCookie(res, accessToken);

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

        if (req.cookies?.accessToken) this.authService.clearAccessCookie(res);
        if (req.cookies?.refreshToken) this.authService.clearRefreshCookie(res);

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
        
        const { otp, otpExpiry } = this.authService.generateOTP(15);

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
        const oauthData = req.user;
        const fallbackURL = req.query.fallbackUrl || `${CLIENT_URL}/login?error=oauth_failed&success=false`;
        
        if (!oauthData || !oauthData.provider || !oauthData.providerId || !oauthData.email) {
            return res.redirect(fallbackURL);
        }

        const { accessToken, refreshToken, user } = await this.authService.handleOauthLogin(oauthData);
        this.authService.setRefreshCookie(res, refreshToken);

        // Redirect to frontend with token (or use a different approach)
        const redirectUrl = `${CLIENT_URL || 'http://localhost:3000'}/login?success=true`;
        this.authService.setAccessCookie(res, accessToken);
        this.authService.setRefreshCookie(res, refreshToken);
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
        const role = req.user.role;
        const data = req.body;

        const user = await this.authService.updateById(userId, data);
        const userData = await this.authService.completeProfile(userId, role, data);

        res.status(200).json({
            success: true,
            message: 'Profile completed successfully',
            data: {user: userData},
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

    /** Verify email (GET - for clicking link in email)
     * @route GET /api/v1/auth/verify-email
     * @access Public
     */
    verifyEmailLink = asyncHandler(async (req, res) => {
        const { token } = req.query;
        if (!token) {
            return res.redirect(`${CLIENT_URL}/auth/verify-email?error=missing_token`);
        }

        try {
            const user = await this.authService.verifyEmailToken(token);
            // Redirect to frontend success page
            return res.redirect(`${CLIENT_URL}/auth/verify-email?success=true&email=${encodeURIComponent(user.email)}`);
        } catch (error) {
            // Redirect to frontend error page
            return res.redirect(`${CLIENT_URL}/auth/verify-email?error=invalid_token`);
        }
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

    const verificationToken = this.authService.generateToken(user);
    const verificationLink = `${CLIENT_URL}/auth/verify-email?token=${verificationToken}`;
    await this.mailService.initiateAccountVerfication(email, verificationLink);

    res.status(200).json({ success:true, message: 'Verification email sent' });
    });

    /** Test mail speed (debug only)
     * @route POST /api/v1/auth/test-mail-speed
     * @access Public
     */
    testMailSpeed = asyncHandler(async (req, res) => {
        const { email } = req.body;
        if (!email) throw AppError.badRequest('Email is required for test');

        const start = Date.now();
        const result = await this.mailService.sendEmail(
            email, 
            "Speed Test", 
            "<p>Speed test</p>"
        );
        const duration = Date.now() - start;

        res.status(200).json({
            success: true,
            duration: `${duration}ms`,
            messageId: result.info.messageId,
            note: "If this response was fast (<5s) but email arrives late, the issue is with Gmail/Provider delivery queue."
        });
    });  

}

export default new AuthController(authService, mailService);