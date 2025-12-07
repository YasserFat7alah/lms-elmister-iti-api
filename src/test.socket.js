

import axios from "axios";
import { io } from "socket.io-client";

const API_URL = "http://localhost:5000/api/v1/lessons";
const SOCKET_URL = "http://localhost:5000";


const STUDENT_ID = "692e3419a623bbb18abefb5d";

// ---  Connect to socket ---
const socket = io(SOCKET_URL);

socket.on("connect", () => {
    console.log("Connected to Socket.io server:", socket.id);

    // join student room
    socket.emit("joinRoom", {
        userId: STUDENT_ID,
        role: "student",
    });
});

// Listen for notifications
socket.on("notification", (data) => {
    console.log("New Notification:");
    console.log(data);
});

// --- Create new lesson ---
async function createLesson() {
    try {
        const res = await axios.post(
            API_URL,
            {
                title: "Sockets Real Test Lesson",
                description: "Testing real socket",
                type: "offline",
                order: Math.floor(Math.random() * 1000),
                groupId: "6931a2b7af2b54535f00b326"
            },
            {
                headers: {
                    Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzMxNzM2ODYzYjA3MmQ1OTIyOWNkMiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc2NTAxMjEzNywiZXhwIjoxNzY1MDEzMDM3fQ.8y4oyBzDhkzwob0Q7b2jTFyV-XFNfpy41FWYYsKihlE",
                },
            }
        );

        console.log("Lesson created:", res.data);

    } catch (err) {
        console.error("Error:", err.response?.data || err.message);
    }
}


setTimeout(createLesson, 1000);
