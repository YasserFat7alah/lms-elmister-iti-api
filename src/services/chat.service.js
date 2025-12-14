import mongoose from 'mongoose';
import Conversation from "../models/chat/Conversation.js";
import Message from "../models/chat/Message.js";
import AppError from "../utils/app.error.js";

class ChatService {

    async startConversation(userA, userB) {
        const participantsArr = [String(userA), String(userB)].sort();

        const participantsObjectIds = participantsArr.map(id => new mongoose.Types.ObjectId(id));
        const participantsKey = participantsArr.join('_');

        // to avoid  creating duplicate conversations
        const conv = await Conversation.findOneAndUpdate(
            { participantsKey },
            {
                $setOnInsert: {
                    participants: participantsObjectIds,
                    participantsKey,
                }
            },
            { new: true, upsert: true }
        );

        // Populate participants
        const populatedConv = await Conversation.findById(conv._id).populate('participants', 'name role');
        console.log('[ChatService] Conversation upserted/retrieved:', conv._id, 'participants:', populatedConv?.participants || conv.participants);
        return populatedConv || conv;
    }

    async getUserConversations(userId) {
        const convs = await Conversation.find({ participants: userId })
            .populate("participants", "name role")
            .populate("lastMessage")
            .sort({ updatedAt: -1 });

        // Deduplicate conversations in case DB contains duplicates (by participantsKey or computed key)
        const seen = new Map();
        convs.forEach(c => {
            const key = c.participantsKey || (c.participants || []).map(p => String(p._id || p.id || p)).sort().join('_');
            const existing = seen.get(key);
            if (!existing) {
                seen.set(key, c);
            } else {
                // preserve most recently updated one
                if (new Date(c.updatedAt) > new Date(existing.updatedAt)) seen.set(key, c);
            }
        });

        return Array.from(seen.values()).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    async getMessages(conversationId, userId) {

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) throw AppError.notFound("Conversation not found");

        // Compare by string to handle ObjectId vs string mismatch
        const isParticipant = conversation.participants.some(p => String(p) === String(userId));
        console.log('[ChatService]  Conversation participants:', conversation.participants.map(p => String(p)), 'Checking user:', String(userId), 'isParticipant:', isParticipant);
        if (!isParticipant) {
            throw AppError.forbidden("You are not part of this conversation");
        }
        const messages = await Message.find({ conversation: conversationId })
            .populate("sender", "name role")
            .sort({ createdAt: 1 });

        return messages;
    }

    async sendMessage({ conversationId, senderId, text }) {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) throw AppError.notFound('Conversation not found');

        const isParticipant = conversation.participants.some(p => String(p) === String(senderId));
        if (!isParticipant) throw AppError.forbidden('You are not part of this conversation');

        const msg = await Message.create({
            conversation: conversationId,
            sender: senderId,
            text
        });

        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessage: msg._id,
            updatedAt: Date.now()
        });

        const populatedMsg = await Message.findById(msg._id).populate('sender', 'name role avatar');
        return populatedMsg || msg;
    }
}

export default ChatService;
