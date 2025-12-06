import BaseService from "./base.service";
import AppError from "../utils/app.error.js";
import Notification from "../models/Notification.js";

class NotificationService extends BaseService {
    constructor() {
        super(Notification);
    }


    async createNotification(data) {
        const created = await super.create(data);
        return created;
    }

    async getUnread() {
        return await super.findAll({ isRead: false }, "", "-createdAt");
    }

    async markAsRead(id) {
        return await super.updateById(id, { isRead: true });
    }

    async markAllRead() {
        return await this.model.updateMany({ isRead: false }, { isRead: true });
    }
}

export default NotificationService;

