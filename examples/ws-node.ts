import * as http from "node:http";
import { WebSocketServer } from "../ws.ts";

const wsServer = new WebSocketServer();
const httpServer = http.createServer(async (req, res) => {
    if (req.headers.upgrade === "websocket") {
        const { socket } = await wsServer.upgrade(req);

        console.log("client connected");
        socket.send("hello from server");

        socket.addEventListener("message", (event) => {
            console.log(`received from client: ${event.data}`);
        });
    }
});

httpServer.listen(8000, () => {
    const ws = new WebSocket("http://localhost:8000");

    ws.onopen = () => {
        console.log("server connected");
    };
    ws.onmessage = (event) => {
        console.log(`received from server: ${event.data}`);
        ws.send("hello from client");
    };
});
