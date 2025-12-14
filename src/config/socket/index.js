import { Server } from "socket.io";
import Conversation from "./../../models/chat/Conversation.js";
import ChatService from './../../services/chat.service.js';
import Message from "./../../models/chat/Message.js";
import authService from "./../../services/auth.service.js";
import { JWT_SECRET } from "./../../utils/constants.js";

let io;

/**
 * Initialize Socket.io
 */
export function initSocket(server, options = {}) {
    io = new Server(server, {
        cors: { 
            origin: options.frontendOrigin || ["http://localhost:3000", "http://localhost:3001"],
            credentials: true,
            methods: ["GET", "POST"]
        },
        path: "/socket.io",
        transports: ['websocket', 'polling']
    });

    console.log('[Socket.io]  Initializing Socket.io server...');

    // Authentication Middleware
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            console.log('[Socket Auth] Token present:', !!token);
            
            if (!token) {
                return next(new Error("Unauthorized"));
            }
            
            const payload = authService.verifyToken(token, JWT_SECRET);
            console.log('[Socket Auth]  Authenticated user:', payload.id, payload.name || 'Name not in token');
            
            socket.userId = payload.id;
            socket.userName = payload.name;
            socket.userRole = payload.role;
            next();
        } catch (err) {
            console.error('[Socket Auth]  Token verification failed:', err.message);
            next(new Error("Unauthorized"));
        }
    });

    io.on("connection", (socket) => {
        console.log('[Socket]  New client connected:', socket.id, '| User:', socket.userName || socket.userId);

        /**
         * Join rooms dynamically
         */
        socket.on("joinRoom", ({ role, userId, groupId }) => {
            socket.userId = userId;
            socket.userRole = role;
            
            if (role) {
                socket.join(role);
                console.log(`[Socket]  Joined role room: ${role}`);
            }
            
            if (userId) {
                const roomName = `user_${userId}`;
                socket.join(roomName);
                console.log(`[Socket] Joined user room: ${roomName} | Socket: ${socket.id}`);
                
                // Verify room membership
                const rooms = Array.from(socket.rooms);
                console.log(`[Socket] All rooms for socket ${socket.id}:`, rooms);
            }
            
            if (groupId) {
                socket.join(`group_${groupId}`);
                console.log(`[Socket] 📂 Joined group room: group_${groupId}`);
            }
        });

        /**
         * Start conversation
         */
        const chatService = new ChatService();
        socket.on("startConversation", async ({ receiverId }, callback) => {
            try {
                console.log('[Socket] 🆕 Starting conversation (socket):', socket.userId, '→', receiverId);
                const senderId = socket.userId;
                const conv = await chatService.startConversation(senderId, receiverId);
                if (conv) console.log('[Socket] Conversation returned:', conv._id);
                // Notify participants via socket
                conv.participants.forEach(p => {
                    io.to(`user_${p}`).emit('conversationCreated', conv);
                });
                callback({ conversationId: conv._id });
            } catch (err) {
                console.error('[Socket]  Error starting conversation (socket):', err);
                callback({ error: err.message });
            }
        });

        /**
         * Send message
         */
        socket.on("sendMessage", async ({ conversationId, receiverId, text }) => {
            try {
                const senderId = socket.userId;
                console.log('[Socket]  === MESSAGE SEND START ===');
                console.log('[Socket] From:', senderId);
                console.log('[Socket] To:', receiverId);
                console.log('[Socket] Conversation:', conversationId);

                // Validate conversation
                const conversation = await Conversation.findById(conversationId);
                if (!conversation) {
                    console.error('[Socket]  Conversation not found:', conversationId);
                    return socket.emit("errorMessage", { message: "Conversation not found", conversationId });
                }
                
                console.log('[Socket] 📋 Conversation participants:', conversation.participants.map(p => String(p)));
                
                if (!senderId) {
                    console.error('[Socket] ❌ Socket had no authenticated userId:', socket.id);
                    return socket.emit('errorMessage', { message: 'Socket not authenticated', socketId: socket.id });
                }

                const participantStrings = conversation.participants.map(p => String(p));
                const isMember = participantStrings.some(p => String(p) === String(senderId));
                if (!isMember) {
                    console.error('[Socket]  User not part of conversation:', senderId, 'Participants:', participantStrings);
                    return socket.emit("errorMessage", {
                        message: "You are not part of this conversation",
                        senderId,
                        participants: participantStrings,
                        conversationId
                    });
                }

                // Create message
                const message = await Message.create({
                    conversation: conversationId,
                    sender: senderId,
                    text,
                });


                //  Populate sender information
                const populatedMessage = await Message.findById(message._id)
                    .populate('sender', 'name role avatar');

                if (!populatedMessage || !populatedMessage.sender) {
                    console.error('[Socket]  Failed to populate message sender');
                    return socket.emit("errorMessage", { message: "Failed to send message" });
                }

                console.log('[Socket] Message populated with sender:', {
                    senderId: populatedMessage.sender._id,
                    senderName: populatedMessage.sender.name,
                    senderRole: populatedMessage.sender.role
                });

                // Prepare payload
                const payload = {
                    _id: populatedMessage._id,
                    conversation: populatedMessage.conversation,
                    sender: {
                        _id: populatedMessage.sender._id,
                        name: populatedMessage.sender.name,
                        role: populatedMessage.sender.role,
                    },
                    text: populatedMessage.text,
                    createdAt: populatedMessage.createdAt,
                };

                //  Emit to ALL participants
                console.log('[Socket]  Emitting to participants:', conversation.participants);
                
                let emittedCount = 0;
                conversation.participants.forEach((participantId) => {
                    const roomName = `user_${participantId}`;
                    
                    // Get all sockets in this room
                    const socketsInRoom = io.sockets.adapter.rooms.get(roomName);
                    console.log(`[Socket]  Room ${roomName} has ${socketsInRoom?.size || 0} socket(s):`, 
                        socketsInRoom ? Array.from(socketsInRoom) : 'No sockets');
                    
                    // Emit to the room
                    io.to(roomName).emit("newMessage", payload);
                    emittedCount++;
                    
                    console.log(`[Socket]  Emitted "newMessage" to room: ${roomName}`);
                });

                // Update conversation's last message
                await Conversation.findByIdAndUpdate(conversationId, {
                    lastMessage: populatedMessage._id,
                    updatedAt: Date.now()
                });

            } catch (err) {
                console.error('[Socket] ❌ Error sending message:', err);
                socket.emit("errorMessage", { message: err.message });
            }
        });

        socket.on("disconnect", (reason) => {
            console.log('[Socket] ❌ Client disconnected:', socket.id, '| User:', socket.userName || socket.userId, '| Reason:', reason);
        });

        socket.on("error", (error) => {
            console.error('[Socket] ❌ Socket error:', error);
        });
    });

    console.log('[Socket.io]  Socket.io initialized and ready');
    return io;
}

/**
 * Get the Socket.io instance
 */
export function getIo() {
    if (!io) throw new Error("Socket.io not initialized");
    return io;
}

/**
 * Emit a notification to specific rooms
 */
export async function emitNotification({ receiverRole, userId = null, groupId = null, notification }) {
    if (!io) throw new Error("Socket.io not initialized");
    
    if (receiverRole) {
        io.to(receiverRole).emit("notification", notification);
        console.log(`[Notification]  Emitted to role: ${receiverRole}`);
    }
    
    if (userId) {
        const roomName = `user_${userId}`;
        io.to(roomName).emit("notification", notification);
        console.log(`[Notification]  Emitted to user: ${roomName}`);
    }
    
    if (groupId) {
        io.to(`group_${groupId}`).emit("notification", notification);
        console.log(`[Notification]  Emitted to group: ${groupId}`);
    }
}