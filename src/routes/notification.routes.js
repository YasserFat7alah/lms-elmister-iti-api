import express from "express";
import auth from "../middlewares/auth.middleware.js";
import NotificationController from "../controllers/notifcation.controller.js";

const router = express.Router();
const { authenticate, authorize } = auth;

//..................Protected routes...................
router.use(authenticate);

//get notifications for a specific user
router.get("/", NotificationController.getMyNotifications);
//mark a notification as read
router.patch("/:id/read", NotificationController.markAsRead);
//delete a notification
router.delete("/:id", NotificationController.deleteNotification);

//send a notification to all users by role "body:{ title, message, role?, type? }"
router.post("/send", authorize("admin"), NotificationController.sendNotification);

export { router as notificationRouter };
