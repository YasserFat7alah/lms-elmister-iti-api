import asyncHandler from "express-async-handler";
import { getIo } from "../config/socket/index.js";


class ChatController {
    constructor(chatService) {
        this.chatService = chatService;
    }
    //start a conversation between two users
    startConversation = asyncHandler(async (req, res) => {
        const userA = req.user._id;
        const { receiverId } = req.body;

        const conv = await this.chatService.startConversation(userA, receiverId);

        res.status(200).json({
            success: true,
            data: conv
        });
    });

    //send message to a conversation
    sendMessage = asyncHandler(async (req, res) => {
        const { conversationId } = req.params;
        const senderId = req.user._id;
        const { text } = req.body;

        const msg = await this.chatService.sendMessage({
            conversationId,
            senderId,
            text
        });

        // emit via socket
        const conversation = await this.chatService.startConversation(senderId, req.body.receiverId);

        const io = getIo();
        conversation.participants.forEach((p) => {
            io.to(`user_${p}`).emit("newMessage", msg);
        });

        res.status(201).json({
            success: true,
            data: msg
        });
    });


    /**
     * get all conversations of a specific user
     * @Route GET api/v1/chat/conversation
    */
    getUserConversations = asyncHandler(async (req, res) => {
        const userId = req.user._id;

        const conv = await this.chatService.getUserConversations(userId);

        res.status(200).json({
            success: true,
            data: conv
        });
    });


    /**
     * get all messages of a specific conversation (history of messages in a conversation)
     * @params conversationId
     * @Route GET api/v1/chat/:conversationId/messages
     * */
    getMessages = asyncHandler(async (req, res) => {
        const { conversationId } = req.params;

        const messages = await this.chatService.getMessages(conversationId, req.user._id);

        res.status(200).json({
            success: true,
            data: messages
        });
    });


}

export default ChatController;
