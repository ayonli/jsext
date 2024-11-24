import { connect, randomPort } from "../net.ts";
import _try from "../try.ts";

const { createServer } = await import("node:net");
const server = createServer((socket) => {
    console.log("connected");
    setTimeout(() => {
        socket.on("error", () => { });
        socket.destroy(new Error("Server closed"));
    }, 50);
});

const port = await randomPort();
await new Promise<void>(resolve => {
    server.listen(port, "127.0.0.1");
    server.once("listening", resolve);
});

const socket = await connect({ hostname: "127.0.0.1", port });
const [err, res] = await _try(socket.closed);

console.log(err, res);
server.close();
