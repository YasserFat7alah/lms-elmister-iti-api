import express from "express";
const router = express.Router();
import authController from "../controllers/auth.controller.js";



router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
// router.post("/refresh-token", authController.refreshTokens);

export { router as authRouter };