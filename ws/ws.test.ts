import { strictEqual } from "node:assert";
import * as http from "node:http";
import { isNode, isNodeBelow20 } from "../env.ts";
import func from "../func.ts";
import { type WebSocketConnection } from "./node.ts";
import bytes, { concat, text } from "../bytes.ts";
import { until } from "../async.ts";
import { randomPort, withWeb } from "../http.ts";
import type { HttpBindings } from "@hono/node-server";

describe("ws:node", () => {
    if (!isNode || typeof EventTarget === "undefined") {
        return;
    }

    it("handle connection in constructor", func(async (defer) => {
        const { WebSocketServer } = await import("../ws/node.ts");

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

        const server = http.createServer(async (req) => {
            await wsServer.upgrade(req);
        });
        const port = await randomPort();
        server.listen(port);
        defer(() => server.close());

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

    it("handle connection in upgrade", func(async (defer) => {
        const { WebSocketServer } = await import("../ws/node.ts");

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

        const server = http.createServer(async (req) => {
            const { socket } = await wsServer.upgrade(req);
            handle(socket);
        });
        const port = await randomPort();
        server.listen(port);
        defer(() => server.close());

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

    it("with web standard", func(async function (defer) {
        if (typeof Request !== "function" || typeof Response !== "function") {
            this.skip();
        }

        const { WebSocketServer } = await import("../ws/node.ts");

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

        const server = http.createServer(withWeb(async (req) => {
            const { response } = await wsServer.upgrade(req);
            return response;
        }));
        const port = await randomPort();
        server.listen(port);
        defer(() => server.close());

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

    it("with Hono framework", func(async function (defer) {
        if (typeof Request !== "function" || typeof Response !== "function") {
            this.skip();
        }

        const { Hono } = await import("hono");
        const { WebSocketServer } = await import("../ws/node.ts");

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

        const app = new Hono()
            .get("/", async (ctx) => {
                const { response } = await wsServer.upgrade(ctx.req.raw);
                return response;
            });

        const server = http.createServer(withWeb(app.fetch));
        const port = await randomPort();
        server.listen(port);
        defer(() => server.close());

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

    it("with Hono Node.js adapter", func(async function (defer) {
        if (isNodeBelow20) {
            this.skip();
        }

        const { Hono } = await import("hono");
        const { serve } = await import("@hono/node-server");
        const { WebSocketServer } = await import("../ws/node.ts");

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

        const app = new Hono<{ Bindings: HttpBindings; }>()
            .get("/", async (ctx) => {
                await wsServer.upgrade(ctx.env.incoming);
                return new Response(null, { status: 101 });
            });

        const port = await randomPort();
        const server = serve({ port, fetch: app.fetch });
        defer(() => server.close());

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
