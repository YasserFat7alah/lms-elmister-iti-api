import http from "http";
import { initSocket } from "./config/socket/index.js";
import app from "./app.js";
import { PORT,CLIENT_URL } from "./utils/constants.js";

const server = http.createServer(app);
const io = initSocket(server, { frontendOrigin: CLIENT_URL });




server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});