import express from "express";
import authController from "../controllers/auth.controller.js";
import validate from "../middlewares/validate.middleware.js";
import { registerSchema, loginSchema } from "../validation/auth.validation.js";
import authMW from "../middlewares/auth.middleware.js";

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

export { router as authRouter };    