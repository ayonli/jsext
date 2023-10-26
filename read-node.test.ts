import { deepStrictEqual, ok } from "node:assert";
import { createReadStream } from "node:fs";
import * as http from "node:http";
// @ts-ignore
import { SSE } from "@ayonli/sse";
// @ts-ignore
import dEventSource from "eventsource";
import { WebSocketServer } from "ws";
// @ts-ignore
import dWebSocket from "isomorphic-ws";
// @ts-ignore
import { EventEmitter } from "events";
import jsext from "./index.ts";

describe("jsext.read", () => {
    it("ReadableStream", async () => {
        const file = createReadStream("./package.json");
        const chunks: Buffer[] = [];

        for await (const chunk of jsext.read(file)) {
            chunks.push(chunk as Buffer);
        }

        ok(chunks.length > 0);
    });

    it("EventSource", jsext.func(async (defer) => {
        const server = http.createServer((req, res) => {
            if (!SSE.isEventSource(req)) {
                res.end();
                return;
            }

            const sse = new SSE(req, res);

            if (req.url === "/message") {
                sse.send("hello");
                sse.send("world");
            } else if (req.url === "/event") {
                sse.emit("reply", "foo");
                sse.emit("reply", "bar");
            } else {
                res.end();
            }
        }).listen(12345);
        defer(() => new Promise(resolve => {
            server.closeAllConnections?.();
            server.close(resolve);
        }));

        const es1 = new dEventSource("http://localhost:12345/message") as EventSource;
        const messages: string[] = [];

        for await (const msg of jsext.read(es1)) {
            messages.push(msg);

            if (messages.length === 2) {
                es1.close();
            }
        }

        deepStrictEqual(messages, ["hello", "world"]);

        const es2 = new dEventSource("http://localhost:12345/event") as EventSource;
        const replies: string[] = [];

        for await (const reply of jsext.read(es2, { event: "reply" })) {
            replies.push(reply);

            if (replies.length === 2) {
                es2.close();
            }
        }

        deepStrictEqual(replies, ["foo", "bar"]);
    }));

    it("WebSocket", jsext.func(async (defer) => {
        const server = http.createServer().listen(12345);
        const wsServer = new WebSocketServer({ server });
        defer(() => new Promise(resolve => {
            server.closeAllConnections?.();
            server.close(resolve);
        }));

        wsServer.on("connection", async ws => {
            for (const msg of ["hello", "world"]) {
                ws.send(msg);
            }
        });

        let ws: WebSocket;

        if (typeof WebSocket === "function") {
            ws = new WebSocket("ws://localhost:12345", "echo-protocol");
        } else {
            ws = new dWebSocket("ws://localhost:12345", "echo-protocol") as unknown as WebSocket;
        }

        const messages: string[] = [];

        for await (const msg of jsext.read<string>(ws)) {
            messages.push(msg);

            if (messages.length === 2) {
                ws.close();
            }
        }

        deepStrictEqual(messages, ["hello", "world"]);
    }));

    it("EventTarget", async () => {
        if (parseInt(process.version.slice(1)) < 15) {
            // EventTarget is available after Node.js v15
            return;
        }

        const target1 = new EventTarget();
        const messages: string[] = [];

        (async () => {
            await Promise.resolve(null);
            target1.dispatchEvent(new MessageEvent("message", { data: "hello" }));
            target1.dispatchEvent(new MessageEvent("message", { data: "world" }));
        })();

        for await (const msg of jsext.read<string>(target1)) {
            messages.push(msg);

            if (messages.length === 2) {
                target1.dispatchEvent(new Event("close"));
            }
        }

        deepStrictEqual(messages, ["hello", "world"]);

        const target2 = new EventTarget();
        const messages2: string[] = [];

        (async () => {
            await Promise.resolve(null);
            target2.dispatchEvent(new MessageEvent("reply", { data: "foo" }));
            target2.dispatchEvent(new MessageEvent("reply", { data: "bar" }));
        })();

        for await (const msg of jsext.read<string>(target2, {
            message: "reply",
            close: "end",
        })) {
            messages2.push(msg);

            if (messages2.length === 2) {
                target2.dispatchEvent(new Event("end"));
            }
        }

        deepStrictEqual(messages2, ["foo", "bar"]);
    });

    it("EventEmitter", async () => {
        const target1 = new EventEmitter();
        const messages: string[] = [];

        (async () => {
            await Promise.resolve(null);
            target1.emit("data", "hello");
            target1.emit("data", "world");
        })();

        for await (const msg of jsext.read<string>(target1)) {
            messages.push(msg);

            if (messages.length === 2) {
                target1.emit("close");
            }
        }

        deepStrictEqual(messages, ["hello", "world"]);

        const target2 = new EventEmitter();
        const messages2: string[] = [];

        (async () => {
            await Promise.resolve(null);
            target2.emit("reply", "foo");
            target2.emit("reply", "bar");
        })();

        for await (const msg of jsext.read<string>(target2, {
            data: "reply",
            close: "end",
        })) {
            messages2.push(msg);

            if (messages2.length === 2) {
                target2.emit("end");
            }
        }

        deepStrictEqual(messages2, ["foo", "bar"]);
    });
});

describe("jsext.readAll", () => {
    it("jsext.readAll", async () => {
        const file = createReadStream("./package.json");
        const chunks = await jsext.readAll(file);

        ok(chunks.length > 0);
    });
});
