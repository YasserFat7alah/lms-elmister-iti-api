import Conversation from "../models/chat/Conversation.js";
import Message from "../models/chat/Message.js";
import AppError from "../utils/app.error.js";

class ChatService {

    async startConversation(userA, userB) {
        // check if conversation already exists
        let conv = await Conversation.findOne({
            participants: { $all: [userA, userB] }
        });
        // if there is no conversation >> create one
        if (!conv) {
            conv = await Conversation.create({
                participants: [userA, userB]
            });
        }

        return conv;
    }

    async getUserConversations(userId) {
        return Conversation.find({ participants: userId })
            .populate("participants", "name role")
            .populate("lastMessage")
            .sort({ updatedAt: -1 });
    }

    async getMessages(conversationId, userId) {

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) throw AppError.notFound("Conversation not found");

        if (!conversation.participants.includes(userId)) {
            throw AppError.forbidden("You are not part of this conversation");
        }
        const messages = await Message.find({ conversation: conversationId })
            .populate("sender", "name role")
            .sort({ createdAt: 1 });

        return messages;
    }

    async sendMessage({ conversationId, senderId, text }) {
        const msg = await Message.create({
            conversation: conversationId,
            sender: senderId,
            text
        });

        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: msg._id
        });

        return msg;
    }
}

export default ChatService;
