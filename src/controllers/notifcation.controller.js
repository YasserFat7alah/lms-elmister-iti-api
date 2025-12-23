import asyncHandler from "express-async-handler";
import notificationService from "../services/notification.service.js";
import { emitNotification } from "../config/socket/index.js";
class NotificationController {


    /**
     * Get all notifications for a specific user
     * @routes GET /api/v1/notifications
     */
    getMyNotifications = asyncHandler(async (req, res) => {
        const notifications = await notificationService.getUserNotifications(req.user);

        res.json({
            success: true,
            count: notifications.length,
            data: notifications
        });
    });


    /**
     * Mark a notification as read
     * @routes PATCH /api/v1/notifications/:id/read
     */
    markAsRead = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const notification = await notificationService.markAsRead(id, req.user._id);

        res.json({
            success: true,
            data: notification
        });
    });

    /**
     * Delete a notification
     * @routes DELETE /api/v1/notifications/:id
     */
    deleteNotification = asyncHandler(async (req, res) => {
        const { id } = req.params;

        await notificationService.deleteNotification(id, req.user._id);

        res.json({
            success: true,
            message: "Notification deleted successfully"
        });
    });

    /**
 * Admin sends a notification to a role or all users >> (Admin) 
 * @routes POST /api/v1/notifications/send
 */
    sendNotification = asyncHandler(async (req, res) => {
        const { title, message, role, type } = req.body;

        if (!title || !message) {
            throw new Error("Title and message are required");
        }

        // if role is provided, send to that role, otherwise default to 'user' (all regular users)
        const notification = await notificationService.notifyByRole({
            role: role || "user",
            title,
            message,
            type: type || "SYSTEM",
            actor: req.user._id
        });

        // emit to socket for that role
        emitNotification({
            receiverRole: role || "user",
            notification
        });

        res.status(201).json({
            success: true,
            data: notification
        });
    });

}

export default new NotificationController();
