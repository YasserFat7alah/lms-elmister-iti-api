import User from "../models/users/User.js";
import Notification from "../models/Notification.js";
import AppError from "../utils/app.error.js";
import { emitNotification } from "../config/socket/index.js";

class NotificationService {


    /**
     * Notify a user of an event.
     * @param {Object} options - options for creating the notification
     * @param {string} options.receiver - the user to notify
     * @param {string} options.title - the title of the notification
     * @param {string} options.message - the message of the notification
     * @param {string} [options.type="SYSTEM"] - the type of the notification
     * @param {string} [options.actor=null] - the actor of the notification
     * @param {string} [options.refId=null] - the reference id of the notification
     * @param {string} [options.refCollection=null] - the reference collection of the notification
     * @param {string} [options.priority="normal"] - the priority of the notification
     * @returns {Promise<Notification>} The created notification
     * @throws {badRequest} If the receiver is not provided
     */
    async notifyUser({
        receiver, title, message, type = "SYSTEM", actor = null,
        refId = null, refCollection = null, priority = "normal" }) {

        if (!receiver) {
            throw AppError.badRequest("Receiver is required");
        }

        const notification = await Notification.create({
            receiver,
            title,
            message,
            type,
            actor,
            refId,
            refCollection,
            priority,
            targetAdmin: false
        });

        // Emit socket event
        try {
            await emitNotification({
                userId: receiver,
                notification: notification.toObject() // ensure it's a plain object
            });
        } catch (error) {
            console.error("Failed to emit socket notification:", error);
            // Don't fail the request if socket fails
        }

        return notification;
    }


    /**
     * Notify multiple users of an event.
     * @param {Object} options - options for creating the notifications
     * @param {string[]} options.userIds - the users to notify
     * @param {string} options.title - the title of the notification
     * @param {string} options.message - the message of the notification
     * @param {string} [options.type="SYSTEM"] - the type of the notification
     * @param {string} [options.actor=null] - the actor of the notification
     * @param {string} [options.refId=null] - the reference id of the notification
     * @param {string} [options.refCollection=null] - the reference collection of the notification
     * @param {string} [options.priority="normal"] - the priority of the notification
     * @returns {Promise<Notification[]>} The created notifications
     * @throws {badRequest} If no receivers are provided
     */
    async notifyManyUsers({
        userIds = [],
        title,
        message,
        type = "SYSTEM",
        actor = null,
        refId = null,
        refCollection = null,
        priority = "normal",
    }) {

        if (!userIds.length) {
            throw AppError.badRequest("No receivers provided");
        }

        const notifications = userIds.map((id) => ({
            receiver: id,
            title,
            message,
            type,
            actor,
            refId,
            refCollection,
            priority,
            targetAdmin: false
        }));

        const createdNotifications = await Notification.insertMany(notifications);

        // Emit socket events
        // Optimization: Could emit to a list of users if socket supported it, 
        // but for now we'll iterate or if there's a group equivalent.
        // Assuming individual emissions for now.
        createdNotifications.forEach(notification => {
            try {
                emitNotification({
                    userId: notification.receiver,
                    notification: notification.toObject()
                });
            } catch (error) {
                console.error(`Failed to emit socket notification for user ${notification.receiver}:`, error);
            }
        });

        return createdNotifications;
    }


    /**
     * Notify users of a specific role of an event.
     * @param {Object} options - options for creating the notification
     * @param {string} options.role - the role of the users to notify
     * @param {string} options.title - the title of the notification
     * @param {string} options.message - the message of the notification
     * @param {string} [options.type="SYSTEM"] - the type of the notification
     * @param {string} [options.actor=null] - the actor of the notification
     * @param {string} [options.refId=null] - the reference id of the notification
     * @param {string} [options.refCollection=null] - the reference collection of the notification
     * @param {string} [options.priority="normal"] - the priority of the notification
     * @returns {Promise<Notification>} The created notification
     */
    async notifyByRole({
        role = "admin", title, message,
        type = "SYSTEM", actor = null,
        refId = null, refCollection = null,
        priority = "normal",
    }) {

        if (!title || !message) {
            throw AppError.badRequest("Title and message are required");
        }
        const notification = await Notification.create({
            receiverRole: role,
            title,
            message,
            type,
            actor,
            refId,
            refCollection,
            priority,
            receiver: null,
            targetAdmin: role === "admin"
        });

        // Emit socket event to role room
        try {
            await emitNotification({
                receiverRole: role,
                notification: notification.toObject()
            });
        } catch (error) {
            console.error(`Failed to emit socket notification for role ${role}:`, error);
        }

        return notification;
    }


    /**
     * Notify all admins of an event.
     * @param {Object} options - options for creating the notification
     * @param {string} options.title - the title of the notification
     * @param {string} options.message - the message of the notification
     * @param {string} [options.type="SYSTEM"] - the type of the notification
     * @param {string} [options.actor=null] - the actor of the notification
     * @param {string} [options.refId=null] - the reference id of the notification
     * @param {string} [options.refCollection=null] - the reference collection of the notification
     * @param {string} [options.priority="normal"] - the priority of the notification
     * @returns {Promise<Notification>} The created notification
     */
    async notifyAdmins({
        title,
        message,
        type = "SYSTEM",
        actor = null,
        refId = null,
        refCollection = null,
        priority = "normal",
    }) {
        return await this.notifyByRole({
            role: "admin",
            title,
            message,
            type,
            actor,
            refId,
            refCollection,
            priority
        });
    }


    /**
     * Get all notifications for a specific user.
     * The notifications can be either targeted at the user directly (receiver) or
     * targeted at all admins (targetAdmin)
     * @param {string} userId - The ID of the user
     * @returns {Promise<Notification[]>} The notifications for the user
     */
    async getUserNotifications(user) {

        const query = user.role === "admin"
            ? { $or: [{ receiver: user._id }, { targetAdmin: true }] }
            : { receiver: user._id };

        return await Notification.find(query)
            .sort({ createdAt: -1 })
            .populate("actor", "name email")
            .lean();
    }


    /**
     * Get all notifications for a specific role.
     * @param {string} role - The role of the notifications to get (e.g., 'admin')
     * @returns {Promise<Notification[]>} The notifications for the role
     */
    async getByRole(role) {//not implemented

        return await Notification.find({ receiverRole: role })
            .sort({ createdAt: -1 })
            .lean();
    }


    /**
     * Mark a notification as read.
     * @param {string} notificationId - The ID of the notification
     * @param {string} userId - The ID of the user
     * @returns {Promise<Notification>} The updated notification
     */
    async markAsRead(notificationId, userId) {
        const notification = await Notification.findOne({
            _id: notificationId,
            $or: [{ receiver: userId }, { receiver: null }]
        });

        if (!notification) {
            throw AppError.notFound("Notification not found");
        }

        notification.isRead = true;
        await notification.save();

        return notification;
    }

    /**
     * Delete a notification for a specific user.
     * @param {string} notificationId - The ID of the notification
     * @param {string} userId - The ID of the user
     * @returns {Promise<Notification>} The deleted notification
     */
    async deleteNotification(notificationId, user) {
        // Log query params for debugging
        // console.log(`Deleting notification ${notificationId} for user ${user._id} role ${user.role}`);

        const query = user.role === "admin"
            ? { _id: notificationId, $or: [{ receiver: user._id }, { receiver: null }, { targetAdmin: true }] }
            : { _id: notificationId, receiver: user._id };

        const notification = await Notification.findOne(query);

        if (!notification) {
            throw AppError.notFound("Notification not found");
        }

        await notification.deleteOne();
        return notification;
    }


}

export default new NotificationService();
