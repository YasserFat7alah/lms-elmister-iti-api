import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

socket.on("connect", () => {
    console.log("Connected as admin:", socket.id);

    // join admin room
    socket.emit("joinAdminRoom");
});

// listen for notifications
socket.on("adminNotification", (data) => {
    console.log("NEW ADMIN NOTIFICATION:", data);
});

socket.on("disconnect", () => {
    console.log("Disconnected from server");
});
