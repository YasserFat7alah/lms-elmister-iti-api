import asyncHandler from "express-async-handler";

class NotificationController {
    constructor(notificationService) {
        this.notificationService = notificationService;
    }

    getAll = asyncHandler(async (req, res) => {
        const notifications = await this.notificationService.findAll({}, "", "-createdAt");
        res.json({
            success: true,
            results: notifications.length,
            data: notifications
        });
    });

    getUnread = asyncHandler(async (req, res) => {
        const notifications = await this.notificationService.getUnread();
        res.json({
            success: true,
            results: notifications.length,
            data: notifications
        });
    });

    markAsRead = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const updated = await this.notificationService.markAsRead(id);
        res.json({
            success: true,
            data: updated
        });
    });

    markAllRead = asyncHandler(async (req, res) => {
        await this.notificationService.markAllRead();
        res.json({
            success: true, 
            message: "All notifications marked as read"
        });
    });
}

export default NotificationController;
