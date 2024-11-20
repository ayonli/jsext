import * as http from "http";
import { WebSocketServer } from "../ws.ts";
import { withWeb } from "../http/internal.ts";

const wsServer = new WebSocketServer();
const httpServer = http.createServer(withWeb(async (req) => {
    if (req.headers.get("upgrade") === "websocket") {
        const { socket, response } = wsServer.upgrade(req);

        console.log("client connected");
        socket.send("hello from server");

        socket.addEventListener("message", (event) => {
            console.log(`received from client: ${event.data}`);
        });

        return response;
    } else {
        return new Response("Hello, World!", { status: 200 });
    }
}));

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
