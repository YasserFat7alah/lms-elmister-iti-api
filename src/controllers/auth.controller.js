import ApiError from "../utils/ApiError.js";
import asyncHandler from "express-async-handler";
import authService from "../services/auth.service.js";


class AuthController {

    setRefreshCookie(res, refreshToken) {
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', 
            sameSite: 'Lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days 
        });
    }

    register = asyncHandler(async (req, res) => {
        const { name, email, password, role, age } = req.body;
        if (!name || !email || !password || !role || !age) {    
            throw ApiError.badRequest('N    ame, email, and password are required');
        }

        const { accessToken, refreshToken, user } = await authService.register(req.body);

        //  Set the  REFRESH TOKEN in cookie
        this.setRefreshCookie(res, refreshToken);

        //response with user and access token (body) >> maybe needs refactoring later
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: { user, accessToken },
        });
    });

    login = asyncHandler(async (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) {
            throw ApiError.badRequest('Email and password are required');
        }

        const { accessToken, refreshToken, user } = await authService.login(email, password);
        this.setRefreshCookie(res, refreshToken);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: { user, accessToken },
        });
    });

    logout = asyncHandler(async (req, res) => {
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
        });

        res.status(200).json({
            message: 'Logged out successfully',
        });
    });

    refreshToken = asyncHandler(async (req, res) => {
        const oldRefreshToken = req.cookies.refreshToken;
        if (!oldRefreshToken) {
            throw ApiError.unauthorized('Refresh token not found');
        }

        const { accessToken, refreshToken: newRefreshToken, user } = await authService.refreshTokens(oldRefreshToken);

        this.setRefreshCookie(res, newRefreshToken);
        res.status(200).json({
            success: true,
            message: 'Token refreshed successfully',
            data: { user, accessToken },
        });
    });

}

export default new AuthController();