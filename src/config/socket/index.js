import { Server } from "socket.io";

let io;

/**
 * Initialize Socket.io
 * @param {http.Server} server - HTTP server created from Express
 * @param {object} options - Optional configuration (CORS, etc.)
 * @returns {Server} Socket.io instance
 */
export function initSocket(server, options = {}) {
    io = new Server(server, {
        cors: { origin: options.frontendOrigin || "*", },
    });

    io.on("connection", (socket) => {
        console.log("New client connected:", socket.id);

        /**
         * Join rooms dynamically
         * roles: 'admin', 'teacher', 'student', 'parent', 'user'
         * userId: for personal notifications
         * groupId: for course/class group notifications
         */
        socket.on("joinRoom", ({ role, userId, groupId }) => {
            if (role) socket.join(role);
            if (userId) socket.join(`user_${userId}`);
            if (groupId) socket.join(`group_${groupId}`);

            console.log(`Socket ${socket.id} joined rooms:`, { role, userId, groupId });
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
        });
    });

    console.log("Socket.io initialized");
    return io;
}

/**
 * Get the Socket.io instance
 * @returns {Server} Socket.io instance
 */
export function getIo() {
    if (!io) throw new Error("Socket.io not initialized");
    return io;
}

/**
 * Emit a notification to specific rooms
 * @param {object} options - options for emitting
 * @param {string} options.receiverRole - role room (e.g., 'admin')
 * @param {string} options.userId - user-specific room
 * @param {string} options.groupId - group-specific room
 * @param {object} options.notification - notification object to emit
 */
export async function emitNotification({ receiverRole, userId = null, groupId = null, notification }) {

    if (!io) throw new Error("Socket.io not initialized");
    if (receiverRole) io.to(receiverRole).emit("notification", notification); //emit to role
    if (userId) io.to(`user_${userId}`).emit("notification", notification); //emit to user
    if (groupId) io.to(`group_${groupId}`).emit("notification", notification); //emit to group
}