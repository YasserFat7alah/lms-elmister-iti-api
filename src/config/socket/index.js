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

        // Join admin room
        socket.on("joinAdminRoom", () => {
            socket.join("admins");
            console.log(`Socket ${socket.id} joined admins room`);
        });

        //handle user disconnect
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
    if (!io) {
        throw new Error("Socket.io not initialized");
    }
    return io;
}

/**
 * Emit notification to admins
 * @param {object} notification - Notification object to send
 * Example:
 * {
 *   title: "New Testimonial",
 *   message: "Ahmed Ossama added a testimonial",
 *   type: "NEW_TESTIMONIAL",
 *   refId: "objectId",
 *   refCollection: "testimonials",
 *   actor: "objectId"
 * }
 */
export function emitAdminNotification(notification) {
    if (!io) throw new Error("Socket.io not initialized");

    // emit to all sockets in admin room
    io.to("admins").emit("adminNotification", notification);
}
