import { strictEqual } from "node:assert";
import { isBun, isDeno } from "./env.ts";
import func from "./func.ts";
import { type WebSocketConnection } from "./ws.ts";
import bytes, { concat, text } from "./bytes.ts";
import { sleep, until } from "./async.ts";
import { randomPort } from "./http.ts";

declare const Bun: any;

describe("ws", () => {
    if (!isDeno && !isBun) {
        return;
    }

    it("handle connection in constructor", func(async (defer) => {
        const { WebSocketServer } = await import("./ws.ts");

        let errorEvent: ErrorEvent | undefined;
        let closeEvent: CloseEvent | undefined;
        const serverMessages: (string | Uint8Array)[] = [];
        const clientMessages: (string | Uint8Array)[] = [];

        const wsServer = new WebSocketServer((socket) => {
            socket.addEventListener("message", (event) => {
                if (typeof event.data === "string") {
                    serverMessages.push(event.data);
                    socket.send("client sent: " + event.data);
                } else {
                    serverMessages.push(event.data);
                    socket.send(concat(bytes("client sent: "), event.data));
                }
            });

            socket.addEventListener("error", (ev) => {
                errorEvent = ev;
            });

            socket.addEventListener("close", (ev) => {
                closeEvent = ev;
            });
        });

        const port = await randomPort();

        if (isDeno) {
            const server = Deno.serve({ port }, async req => {
                const { response } = await wsServer.upgrade(req);
                return response;
            });
            defer(() => Promise.race([server.shutdown(), sleep(100)]));
        } else {
            const server = Bun.serve({
                port,
                fetch: async (req: Request) => {
                    const { response } = await wsServer.upgrade(req);
                    return response;
                },
                websocket: wsServer.bunListener,
            });
            wsServer.bunBind(server);
            defer(() => server.stop(true));
        }

        const ws = new WebSocket(`ws://localhost:${port}`);

        ws.binaryType = "arraybuffer";
        ws.onopen = () => {
            ws.send("text");
        };

        ws.onmessage = (event) => {
            if (typeof event.data === "string") {
                clientMessages.push(event.data);
            } else {
                clientMessages.push(new Uint8Array(event.data as ArrayBuffer));
            }

            if (clientMessages.length === 2) {
                ws.close();
            } else {
                ws.send(bytes("binary"));
            }
        };

        await until(() => serverMessages.length === 2 && clientMessages.length === 2 && !!closeEvent);

        strictEqual(errorEvent, undefined);
        strictEqual(closeEvent?.type, "close");
        strictEqual(closeEvent?.wasClean, true);
        try {
            strictEqual(closeEvent?.code, 1000);
        } catch {
            strictEqual(closeEvent?.code, 1005);
        }
        strictEqual(serverMessages[0], "text");
        strictEqual(text(serverMessages[1] as Uint8Array), "binary");
        strictEqual(clientMessages[0], "client sent: text");
        strictEqual(text(clientMessages[1] as Uint8Array), "client sent: binary");
    }));

    it("handle connection in upgrade", func(async (defer) => {
        const { WebSocketServer } = await import("./ws.ts");

        let errorEvent: ErrorEvent | undefined;
        let closeEvent: CloseEvent | undefined;
        const serverMessages: (string | Uint8Array)[] = [];
        const clientMessages: (string | Uint8Array)[] = [];

        const wsServer = new WebSocketServer();
        const handle = (socket: WebSocketConnection) => {
            socket.addEventListener("message", (event) => {
                if (typeof event.data === "string") {
                    serverMessages.push(event.data);
                    socket.send("client sent: " + event.data);
                } else {
                    serverMessages.push(event.data);
                    socket.send(concat(bytes("client sent: "), event.data));
                }
            });

            socket.addEventListener("error", (ev) => {
                errorEvent = ev;
            });

            socket.addEventListener("close", (ev) => {
                closeEvent = ev;
            });
        };

        const port = await randomPort();

        if (isDeno) {
            const server = Deno.serve({ port }, async req => {
                const { socket, response } = await wsServer.upgrade(req);
                handle(socket);
                return response;
            });
            defer(() => Promise.race([server.shutdown(), sleep(100)]));
        } else {
            const server = Bun.serve({
                port,
                fetch: async (req: Request) => {
                    const { socket, response } = await wsServer.upgrade(req);
                    handle(socket);
                    return response;
                },
                websocket: wsServer.bunListener,
            });
            wsServer.bunBind(server);
            defer(() => server.stop(true));
        }

        const ws = new WebSocket(`ws://localhost:${port}`);

        ws.binaryType = "arraybuffer";
        ws.onopen = () => {
            ws.send("text");
        };

        ws.onmessage = (event) => {
            if (typeof event.data === "string") {
                clientMessages.push(event.data);
            } else {
                clientMessages.push(new Uint8Array(event.data as ArrayBuffer));
            }

            if (clientMessages.length === 2) {
                ws.close();
            } else {
                ws.send(bytes("binary"));
            }
        };

        await until(() => serverMessages.length === 2 && clientMessages.length === 2 && !!closeEvent);

        strictEqual(errorEvent, undefined);
        strictEqual(closeEvent?.type, "close");
        strictEqual(closeEvent?.wasClean, true);
        try {
            strictEqual(closeEvent?.code, 1000);
        } catch {
            strictEqual(closeEvent?.code, 1005);
        }
        strictEqual(serverMessages[0], "text");
        strictEqual(text(serverMessages[1] as Uint8Array), "binary");
        strictEqual(clientMessages[0], "client sent: text");
        strictEqual(text(clientMessages[1] as Uint8Array), "client sent: binary");
    }));

    it("with Hono framework", func(async (defer) => {
        const { Hono } = await import("hono");
        const { WebSocketServer } = await import("./ws.ts");

        let errorEvent: ErrorEvent | undefined;
        let closeEvent: CloseEvent | undefined;
        const serverMessages: (string | Uint8Array)[] = [];
        const clientMessages: (string | Uint8Array)[] = [];

        const wsServer = new WebSocketServer((socket) => {
            socket.addEventListener("message", (event) => {
                if (typeof event.data === "string") {
                    serverMessages.push(event.data);
                    socket.send("client sent: " + event.data);
                } else {
                    serverMessages.push(event.data);
                    socket.send(concat(bytes("client sent: "), event.data));
                }
            });

            socket.addEventListener("error", (ev) => {
                errorEvent = ev;
            });

            socket.addEventListener("close", (ev) => {
                closeEvent = ev;
            });
        });

        const port = await randomPort();
        const app = new Hono()
            .get("/", async (ctx) => {
                const { response } = await wsServer.upgrade(ctx.req.raw);
                return response;
            });

        if (isDeno) {
            const server = Deno.serve({ port }, app.fetch);
            defer(() => Promise.race([server.shutdown(), sleep(100)]));
        } else {
            const server = Bun.serve({
                port,
                fetch: app.fetch,
                websocket: wsServer.bunListener,
            });
            wsServer.bunBind(server);
            defer(() => server.stop(true));
        }

        const ws = new WebSocket(`ws://localhost:${port}`);

        ws.binaryType = "arraybuffer";
        ws.onopen = () => {
            ws.send("text");
        };

        ws.onmessage = (event) => {
            if (typeof event.data === "string") {
                clientMessages.push(event.data);
            } else {
                clientMessages.push(new Uint8Array(event.data as ArrayBuffer));
            }

            if (clientMessages.length === 2) {
                ws.close();
            } else {
                ws.send(bytes("binary"));
            }
        };

        await until(() => serverMessages.length === 2 && clientMessages.length === 2 && !!closeEvent);

        strictEqual(errorEvent, undefined);
        strictEqual(closeEvent?.type, "close");
        strictEqual(closeEvent?.wasClean, true);
        try {
            strictEqual(closeEvent?.code, 1000);
        } catch {
            strictEqual(closeEvent?.code, 1005);
        }
        strictEqual(serverMessages[0], "text");
        strictEqual(text(serverMessages[1] as Uint8Array), "binary");
        strictEqual(clientMessages[0], "client sent: text");
        strictEqual(text(clientMessages[1] as Uint8Array), "client sent: binary");
    }));
});
