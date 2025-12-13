import express from "express";
import auth from "../middlewares/auth.middleware.js";
import ChatService from "../services/chat.service.js";
import ChatController from "../controllers/chat.controller.js";

const router = express.Router();
const { authenticate, authorize } = auth;
//.....................................instances..................................
const chatService = new ChatService();
const chatController = new ChatController(chatService);

//..................................Protected routes..................................
router.use(authenticate);
//Start a conversation between two users
router.post("/conversation", chatController.startConversation);


//---------------------------Fetching Conversations and Messages--------------------------------//
//Get Conversations of Logged-In User 
router.get("/conversation",  chatController.getUserConversations);

//Get messages of a conversation
router.get("/:conversationId/messages",  chatController.getMessages);

//-----------------------------------------------------------------------------------------------//

//Send a message
router.post("/:conversationId/message", chatController.sendMessage);

export { router as chatRouter };
