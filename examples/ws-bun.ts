import { WebSocketServer } from "../ws.ts";

const wsServer = new WebSocketServer();
const bunServer = Bun.serve({
    port: 8000,
    fetch: async (req: Request) => {
        if (req.headers.get("upgrade") === "websocket") {
            const { socket, response } = wsServer.upgrade(req);

            console.log("client connected");
            socket.send("hello from server");

            socket.addEventListener("message", (event) => {
                console.log(`received from client: ${event.data}`);
            });

            return response;
        }

        return new Response("Not a WebSocket request", { status: 400 });
    },
    websocket: wsServer.bunListener,
});
wsServer.bunBind(bunServer);

const ws = new WebSocket("ws://localhost:8000");

ws.onopen = () => {
    console.log("server connected");
};

ws.onmessage = (event) => {
    console.log(`received from server: ${event.data}`);
    ws.send("hello from client");
};
