    import express from "express";
    import authController from "../controllers/auth.controller.js";
    import validate from "../middlewares/validate.middleware.js";
    import { registerSchema, loginSchema } from "../validation/auth.validation.js";
    import authMW from "../middlewares/auth.middleware.js";
    import passport from "passport";

    const router = express.Router();
    const { authenticate, authorize} = authMW;

    /* --- --- --- AUTH ROUTES --- --- --- */
    router.post("/register",validate(registerSchema), authController.register);
    router.post("/login", validate(loginSchema), authController.login);
    router.post("/logout", authController.logout);

    router.post("/refresh-token", authController.refreshToken);// to refresh token automatically 

    /* --- --- --- PASSWORD MANAGEMENT --- --- --- */
    router.post("/change-password", authenticate, authController.changePassword);
    router.post("/forgot-password", authController.forgotPassword);
    router.post("/reset-password", authController.resetPassword);

    /* --- --- --- EMAIL VERIFICATION --- --- --- */
    router.post("/verify-email", authController.verifyEmail);
    router.post("/resend-verification", authController.resendVerification);


    /* --- --- --- OAUTH ROUTES --- --- --- */
    router.get("/google", passport.authenticate('google', { scope: ['email', 'profile'] }));
    router.get(
        "/google/callback",
        passport.authenticate("google", { session: false, failureRedirect: "/api/v1/auth/google" }),
        authController.googleCallback
    );

    /* --- --- --- PROVIDER LINKING --- --- --- */
    router.post("/link-provider", authenticate, authController.linkProvider);
    router.post("/unlink-provider", authenticate, authController.unlinkProvider);

    /* --- --- --- PROFILE COMPLETION --- --- --- */
    router.post("/complete-profile", authenticate, authController.completeProfile);

    export { router as authRouter };