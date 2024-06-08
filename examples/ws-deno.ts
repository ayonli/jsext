/// <reference types="../lib.deno.d.ts" />
import { WebSocketServer } from "../ws.ts";

const wsServer = new WebSocketServer();
Deno.serve({ port: 8000, }, async (req) => {
    if (req.headers.get("upgrade") === "websocket") {
        const { socket, response } = await wsServer.upgrade(req);

        console.log("client connected");
        socket.send("hello from server");

        socket.addEventListener("message", (event) => {
            console.log(`received from client: ${event.data}`);
        });

        return response;
    }

    return new Response("Not a WebSocket request", { status: 400 });
});

const ws = new WebSocket("ws://localhost:8000");

ws.onopen = () => {
    console.log("server connected");
};

ws.onmessage = (event) => {
    console.log(`received from server: ${event.data}`);
    ws.send("hello from client");
};
