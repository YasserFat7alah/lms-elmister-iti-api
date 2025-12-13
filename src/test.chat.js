import { io } from "socket.io-client";
import readline from "readline";
import { jwtDecode } from "jwt-decode";


/**
 * Chat test (reference for front-end)
 * Usage:
 *  <TOKEN_user1> <user2_ID> user2_role
 *  <TOKEN_user2> <user1_ID> user1_role
 */

const [, , token, otherUserId, otherRole] = process.argv;

if (!token || !otherUserId || !otherRole) {
    console.log("Usage: node chatTest.js <JWT token> <otherUserId> <otherRole>");
    process.exit(1);
}

// Decode token to get userId and role
const decoded = jwtDecode(token);
const userId = decoded.id;
const role = decoded.role;

// Connect socket with JWT token
const socket = io("http://localhost:5000", { auth: { token } });

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

let conversationId = null;

socket.on("connect", () => {
    console.log(`Connected as ${role} (${userId}), socket id: ${socket.id}`);

    // Join personal room
    socket.emit("joinRoom", { userId, role });

    // Start or fetch conversation
    socket.emit("startConversation", { receiverId: otherUserId }, (res) => {
        conversationId = res.conversationId;
        console.log(`Conversation started. ID: ${conversationId}`);
        promptMessage();
    });
});

// Listen for incoming messages
socket.on("newMessage", (msg) => {
    // Only show messages from the other participant
    if (!msg.sender || msg.sender._id === userId) return;
    console.log(`\n${otherRole} says: ${msg.text}`);
    promptMessage();
});

function promptMessage() {
    rl.question("You: ", (text) => {
        if (text.toLowerCase() === "exit") {
            socket.disconnect();
            rl.close();
            return;
        }

        socket.emit("sendMessage", {
            conversationId,
            receiverId: otherUserId,
            text,
        });

        promptMessage();
    });
}
