    import express from "express";
    import authController from "../controllers/auth.controller.js";
    import validate from "../middlewares/validate.middleware.js";
    import {
        registerSchema,
        loginSchema,
        changePasswordSchema,
        forgotPasswordSchema,
        resetPasswordSchema,
        verifyEmailSchema,
        resendVerificationSchema,
        linkProviderSchema,
        unlinkProviderSchema,
        completeProfileSchema
    } from "../validation/auth.validation.js";
    import authMW from "../middlewares/auth.middleware.js";
    import passport from "../config/passport/index.js";

    const router = express.Router();
    const { authenticate, authorize} = authMW;

    /* --- --- --- AUTH ROUTES --- --- --- */
    router.post("/register", validate(registerSchema), authController.register);
    router.post("/login", validate(loginSchema), authController.login);
    router.post("/logout", authController.logout);

    router.post("/refresh-token", authController.refreshToken);// to refresh token automatically 

    /* --- --- --- PASSWORD MANAGEMENT --- --- --- */
    router.post("/change-password", authenticate, validate(changePasswordSchema), authController.changePassword);
    router.post("/forgot-password", validate(forgotPasswordSchema), authController.forgotPassword);
    router.post("/reset-password", validate(resetPasswordSchema), authController.resetPassword);

    /* --- --- --- EMAIL VERIFICATION --- --- --- */
    router.get("/verify-email", authController.verifyEmailLink); // GET for clicking link in email
    router.post("/verify-email", validate(verifyEmailSchema), authController.verifyEmail); // POST for API calls
    router.post("/resend-verification", validate(resendVerificationSchema), authController.resendVerification);


    /* --- --- --- OAUTH ROUTES --- --- --- */
    router.get("/google", passport.authenticate('google', { scope: ['openid', 'email', 'profile'] }));
    router.get(
        "/google/callback",
        passport.authenticate("google", { session: false, failureRedirect: "/api/v1/ping" }),
        authController.googleCallback
    );

    /* --- --- --- PROVIDER LINKING --- --- --- */
    router.post("/link-provider", authenticate, validate(linkProviderSchema), authController.linkProvider);
    router.post("/unlink-provider", authenticate, validate(unlinkProviderSchema), authController.unlinkProvider);

    /* --- --- --- PROFILE COMPLETION --- --- --- */
    router.post("/complete-profile", authenticate, validate(completeProfileSchema), authController.completeProfile);

    export { router as authRouter };