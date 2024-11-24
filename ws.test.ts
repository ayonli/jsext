import { strictEqual } from "node:assert";
import * as http from "node:http";
import { isBun, isDeno } from "./env.ts";
import func from "./func.ts";
import { type WebSocketConnection } from "./ws.ts";
import bytes, { concat, text } from "./bytes.ts";
import { select, sleep, until } from "./async.ts";
import { randomPort } from "./http.ts";
import { withWeb } from "./http/internal.ts";

describe("ws", () => {
    if (typeof MessageEvent === "undefined") {
        return;
    }

    it("handle connection in constructor", func(async function (defer) {
        this.timeout(5_000);

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
            const controller = new AbortController();
            Deno.serve({ port, signal: controller.signal }, req => {
                const { response } = wsServer.upgrade(req);
                return response;
            });
            defer(() => controller.abort());
        } else if (isBun) {
            const server = Bun.serve({
                port,
                fetch: (req: Request) => {
                    const { response } = wsServer.upgrade(req);
                    return response;
                },
                websocket: wsServer.bunListener,
            });
            wsServer.bunBind(server);
            defer(() => select([server.stop(true), sleep(100)]));
        } else {
            const server = http.createServer((req) => {
                wsServer.upgrade(req);
            });
            server.listen(port);
            defer(() => server.close());
        }

        let ws: WebSocket;

        if (typeof WebSocket === "function") {
            ws = new WebSocket(`ws://localhost:${port}`);
        } else {
            const dWebSocket = (await import("isomorphic-ws")).default;
            ws = new dWebSocket(`ws://localhost:${port}`) as unknown as WebSocket;
        }

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

    it("handle connection in upgrade", func(async function (defer) {
        this.timeout(5_000);

        const { WebSocketServer } = await import("./ws.ts");

        let openEvent: Event | undefined;
        let errorEvent: ErrorEvent | undefined;
        let closeEvent: CloseEvent | undefined;
        const serverMessages: (string | Uint8Array)[] = [];
        const clientMessages: (string | Uint8Array)[] = [];

        const wsServer = new WebSocketServer();
        const handle = (socket: WebSocketConnection) => {
            socket.addEventListener("open", (ev) => {
                openEvent = ev;
            });

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
            const controller = new AbortController();
            Deno.serve({ port, signal: controller.signal }, req => {
                const { socket, response } = wsServer.upgrade(req);
                handle(socket);
                return response;
            });
            defer(() => controller.abort());
        } else if (isBun) {
            const server = Bun.serve({
                port,
                fetch: (req: Request) => {
                    const { socket, response } = wsServer.upgrade(req);
                    handle(socket);
                    return response;
                },
                websocket: wsServer.bunListener,
            });
            wsServer.bunBind(server);
            defer(() => select([server.stop(true), sleep(100)]));
        } else {
            let server: http.Server;

            if (typeof Request === "function" && typeof Response === "function") {
                server = http.createServer(withWeb((req) => {
                    const { socket, response } = wsServer.upgrade(req);
                    handle(socket);
                    return response;
                }));
            } else {
                server = http.createServer((req) => {
                    const { socket } = wsServer.upgrade(req);
                    handle(socket);
                });
            }

            server.listen(port);
            defer(() => server.close());
        }

        let ws: WebSocket;

        if (typeof WebSocket === "function") {
            ws = new WebSocket(`ws://localhost:${port}`);
        } else {
            const dWebSocket = (await import("isomorphic-ws")).default;
            ws = new dWebSocket(`ws://localhost:${port}`) as unknown as WebSocket;
        }

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

        strictEqual(openEvent?.type, "open");
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

    it("handle connection as async iterable", func(async function (defer) {
        this.timeout(5_000);

        const { WebSocketServer } = await import("./ws.ts");

        let error: Error | null = null;
        let closed = false;
        const serverMessages: (string | Uint8Array)[] = [];
        const clientMessages: (string | Uint8Array)[] = [];

        const wsServer = new WebSocketServer(async socket => {
            try {
                for await (const data of socket) {
                    if (typeof data === "string") {
                        serverMessages.push(data);
                        socket.send("client sent: " + data);
                    } else {
                        serverMessages.push(data);
                        socket.send(concat(bytes("client sent: "), data));
                    }
                }
            } catch (err) {
                error = err as Error;
            }

            closed = true;
        });

        const port = await randomPort();

        if (isDeno) {
            const controller = new AbortController();
            Deno.serve({ port, signal: controller.signal }, req => {
                const { response } = wsServer.upgrade(req);
                return response;
            });
            defer(() => controller.abort());
        } else if (isBun) {
            const server = Bun.serve({
                port,
                fetch: (req: Request) => {
                    const { response } = wsServer.upgrade(req);
                    return response;
                },
                websocket: wsServer.bunListener,
            });
            wsServer.bunBind(server);
            defer(() => select([server.stop(true), sleep(100)]));
        } else {
            let server: http.Server;

            if (typeof Request === "function" && typeof Response === "function") {
                server = http.createServer(withWeb((req) => {
                    const { response } = wsServer.upgrade(req);
                    return response;
                }));
            } else {
                server = http.createServer((req) => {
                    wsServer.upgrade(req);
                });
            }

            server.listen(port);
            defer(() => server.close());
        }

        let ws: WebSocket;

        if (typeof WebSocket === "function") {
            ws = new WebSocket(`ws://localhost:${port}`);
        } else {
            const dWebSocket = (await import("isomorphic-ws")).default;
            ws = new dWebSocket(`ws://localhost:${port}`) as unknown as WebSocket;
        }

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

        await until(() => serverMessages.length === 2 && clientMessages.length === 2 && closed);

        strictEqual(error, null);
        strictEqual(closed, true);
        strictEqual(serverMessages[0], "text");
        strictEqual(text(serverMessages[1] as Uint8Array), "binary");
        strictEqual(clientMessages[0], "client sent: text");
        strictEqual(text(clientMessages[1] as Uint8Array), "client sent: binary");
    }));

    it("with Hono framework", func(async function (defer) {
        if (typeof Request !== "function" || typeof Response !== "function") {
            this.skip();
        }

        this.timeout(5_000);

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
            .get("/", (ctx) => {
                const { response } = wsServer.upgrade(ctx.req.raw);
                return response;
            });

        if (isDeno) {
            const controller = new AbortController();
            Deno.serve({ port, signal: controller.signal }, app.fetch);
            defer(() => controller.abort());
        } else if (isBun) {
            const server = Bun.serve({
                port,
                fetch: app.fetch,
                websocket: wsServer.bunListener,
            });
            wsServer.bunBind(server);
            defer(() => select([server.stop(true), sleep(100)]));
        } else {
            const server = http.createServer(withWeb(app.fetch));
            server.listen(port);
            defer(() => server.close());
        }

        let ws: WebSocket;

        if (typeof WebSocket === "function") {
            ws = new WebSocket(`ws://localhost:${port}`);
        } else {
            const dWebSocket = (await import("isomorphic-ws")).default;
            ws = new dWebSocket(`ws://localhost:${port}`) as unknown as WebSocket;
        }

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
