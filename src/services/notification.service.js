import User from "../models/users/User.js";
import Notification from "../models/Notification.js";
import AppError from "../utils/app.error.js";

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

        return await Notification.insertMany(notifications);
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

        // const notification = await Notification.create({
        //     title,
        //     message,
        //     type,
        //     actor,
        //     refId,
        //     refCollection,
        //     priority,
        //     receiver: null,
        //     receiverRole: "admin",
        //     targetAdmin: true
        // });

        // return notification;
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


}   

export default new NotificationService();
