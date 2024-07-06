import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import EventEmitter from "node:events";
// @ts-ignore
import { SSE } from "@ayonli/sse";
import jsext from "./index.ts";
import bytes from "./bytes.ts";
import {
    readAsArray,
    readAsArrayBuffer,
    readAsBlob,
    readAsDataURL,
    readAsJSON,
    readAsObjectURL,
    readAsText,
    resolveByteStream,
    toAsyncIterable,
    toReadableStream,
    concat,
} from "./reader.ts";
import { randomPort } from "./http.ts";

describe("reader", () => {
    describe("readAsArray", () => {
        it("ReadableStream", async function () {
            if (typeof ReadableStream !== "function" || typeof Response !== "function") {
                this.skip();
            }

            const res = new Response("hello, world");
            const chunks = await readAsArray(res.body!);

            ok(chunks.length > 0);
        });

        it("ReadStream", async () => {
            const file = createReadStream("./package.json");
            const chunks = await readAsArray(file);

            ok(chunks.length > 0);
        });
    });

    describe("readAsArrayBuffer", () => {
        it("Blob", async function () {
            if (typeof Blob !== "function") {
                this.skip();
            }

            const blob = new Blob(["hello, world"]);
            const buffer = await readAsArrayBuffer(blob);

            deepStrictEqual(await blob.arrayBuffer(), buffer);
        });

        it("Uint8Array", async () => {
            const arr = new Uint8Array([1, 2, 3]);
            const buffer = await readAsArrayBuffer(arr);

            deepStrictEqual(buffer, arr.buffer);

            if (typeof Buffer === "function") {
                const arr = Buffer.from([1, 2, 3]);
                const buffer = await readAsArrayBuffer(arr);

                deepStrictEqual(buffer, arr.buffer);
                deepStrictEqual(
                    new Uint8Array(buffer, arr.byteOffset, arr.byteLength),
                    new Uint8Array([1, 2, 3])
                );
            }
        });

        it("ReadableStream", async function () {
            if (typeof ReadableStream !== "function" || typeof Response !== "function") {
                this.skip();
            }

            const res = new Response("hello, world");
            const buffer = await readAsArrayBuffer(res.body!);

            deepStrictEqual(buffer, bytes("hello, world").buffer);
        });

        it("ReadStream", async () => {
            const file = createReadStream("./package.json");
            const buffer = await readAsArrayBuffer(file);

            ok(buffer.byteLength > 0);
        });
    });

    describe("readAsBlob", () => {
        if (typeof Blob !== "function") {
            return;
        }

        it("Uint8Array", async () => {
            const arr = new Uint8Array([1, 2, 3]);
            const blob = await readAsBlob(arr, "application/octet-stream");

            deepStrictEqual(await blob.arrayBuffer(), arr.buffer);
            strictEqual(blob.type, "application/octet-stream");

            if (typeof Buffer === "function") {
                const arr = Buffer.from([1, 2, 3]);
                const blob = await readAsBlob(arr, "application/octet-stream");

                deepStrictEqual(new Uint8Array(await blob.arrayBuffer()), new Uint8Array(arr));
                strictEqual(blob.type, "application/octet-stream");
            }
        });

        it("ReadableStream", async function () {
            if (typeof ReadableStream !== "function" || typeof Response !== "function") {
                this.skip();
            }

            const res = new Response("hello, world");
            const blob = await readAsBlob(res.body!, "text/plain");

            deepStrictEqual(await blob.text(), "hello, world");
            ok(blob.type.startsWith("text/plain"));
        });

        it("ReadStream", async () => {
            const file = createReadStream("./package.json");
            const blob = await readAsBlob(file, "application/json");

            ok(blob.size > 0);
            ok(blob.type.startsWith("application/json"));
        });
    });

    describe("readAsDataURL", () => {
        it("Blob", async function () {
            if (typeof Blob !== "function") {
                this.skip();
            }

            const blob = new Blob(["hello, world"]);
            const dataUrl = await readAsDataURL(blob, "text/plain");

            strictEqual(dataUrl, "data:text/plain;base64,aGVsbG8sIHdvcmxk");
        });

        it("Uint8Array", async () => {
            const arr = new Uint8Array([1, 2, 3]);
            const dataUrl = await readAsDataURL(arr, "application/octet-stream");

            strictEqual(dataUrl, "data:application/octet-stream;base64,AQID");
        });

        it("ReadableStream", async function () {
            if (typeof ReadableStream !== "function" || typeof Response !== "function") {
                this.skip();
            }

            const res = new Response("hello, world");
            const dataUrl = await readAsDataURL(res.body!, "text/plain");

            strictEqual(dataUrl, "data:text/plain;base64,aGVsbG8sIHdvcmxk");
        });

        it("ReadStream", async () => {
            const file = createReadStream("./package.json");
            const dataUrl = await readAsDataURL(file, "application/json");

            ok(dataUrl.startsWith("data:application/json;base64,"));
        });
    });

    describe("readAsObjectURL", () => {
        if (typeof URL !== "object") {
            return;
        }

        it("Blob", async function () {
            if (typeof Blob !== "function") {
                this.skip();
            }

            const blob = new Blob(["hello, world"]);
            const url = await readAsObjectURL(blob, "text/plain");

            ok(url.startsWith("blob:"));
        });

        it("Uint8Array", async () => {
            const arr = new Uint8Array([1, 2, 3]);
            const url = await readAsObjectURL(arr, "application/octet-stream");

            ok(url.startsWith("blob:"));
        });

        it("ReadableStream", async function () {
            if (typeof ReadableStream !== "function" || typeof Response !== "function") {
                this.skip();
            }

            const res = new Response("hello, world");
            const url = await readAsObjectURL(res.body!, "text/plain");

            ok(url.startsWith("blob:"));
        });

        it("ReadStream", async () => {
            const file = createReadStream("./package.json");
            const url = await readAsObjectURL(file, "application/json");

            ok(url.startsWith("blob:"));
        });
    });

    describe("readAsText", () => {
        it("Blob", async function () {
            if (typeof Blob !== "function") {
                this.skip();
            }

            const blob = new Blob(["hello, world"]);
            const text = await readAsText(blob);

            strictEqual(text, "hello, world");
        });

        it("Uint8Array", async () => {
            const arr = bytes("Hello, World!");
            const text = await readAsText(arr);

            strictEqual(text, "Hello, World!");
        });

        it("ReadableStream", async function () {
            if (typeof ReadableStream !== "function" || typeof Response !== "function") {
                this.skip();
            }

            const res = new Response("hello, world");
            const text = await readAsText(res.body!);

            strictEqual(text, "hello, world");
        });

        it("ReadStream", async () => {
            const file = createReadStream("./package.json");
            const text = await readAsText(file);

            ok(text.length > 0);
        });
    });

    describe("readAsJSON", () => {
        it("Blob", async function () {
            if (typeof Blob !== "function") {
                this.skip();
            }

            const obj = { hello: "world" };
            const blob = new Blob([JSON.stringify(obj)], { type: "application/json" });
            const data = await readAsJSON(blob);

            deepStrictEqual(data, obj);
        });

        it("Uint8Array", async () => {
            const obj = { hello: "world" };
            const arr = new Uint8Array(bytes(JSON.stringify(obj)).buffer);
            const data = await readAsJSON(arr);

            deepStrictEqual(data, obj);
        });

        it("ReadableStream", async function () {
            if (typeof ReadableStream !== "function" || typeof Response !== "function") {
                this.skip();
            }

            const obj = { hello: "world" };
            const res = new Response(JSON.stringify(obj), {
                headers: { "Content-Type": "application/json" }
            });
            const data = await readAsJSON(res.body!);

            deepStrictEqual(data, obj);
        });

        it("ReadStream", async () => {
            const file = createReadStream("./package.json");
            const data = await readAsJSON(file);
            const contents = await readFile("./package.json", "utf-8");

            deepStrictEqual(data, JSON.parse(contents));
        });
    });

    describe("toAsyncIterable", () => {
        it("ReadableStream", async function () {
            if (typeof ReadableStream !== "function" || typeof Response !== "function") {
                this.skip();
            }

            const res = new Response("hello, world");
            const chunks: Uint8Array[] = [];

            for await (const chunk of toAsyncIterable(res.body!)) {
                chunks.push(chunk as Uint8Array);
            }

            ok(chunks.length > 0);
        });

        it("ReadStream", async () => {
            const file = createReadStream("./package.json");
            const chunks: Buffer[] = [];

            for await (const chunk of toAsyncIterable(file)) {
                chunks.push(chunk as Buffer);
            }

            ok(chunks.length > 0);
        });

        it("EventSource", jsext.func(async (defer) => {
            const port = await randomPort();
            const server = await new Promise<http.Server>((resolve) => {
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
                }).listen(port, () => resolve(server));
            });
            defer(() => new Promise(resolve => {
                server.closeAllConnections?.();
                server.close(resolve);
            }));

            const dEventSource = typeof EventSource === "function"
                ? EventSource
                : (await import("eventsource")).default;
            const es1 = new dEventSource(`http://localhost:${port}/message`) as EventSource;
            const messages: string[] = [];

            for await (const msg of toAsyncIterable(es1)) {
                messages.push(msg);

                if (messages.length === 2) {
                    es1.close();
                }
            }

            deepStrictEqual(messages, ["hello", "world"]);

            const es2 = new dEventSource(`http://localhost:${port}/event`) as EventSource;
            const replies: string[] = [];

            for await (const reply of toAsyncIterable(es2, { event: "reply" })) {
                replies.push(reply);

                if (replies.length === 2) {
                    es2.close();
                }
            }

            deepStrictEqual(replies, ["foo", "bar"]);
        }));

        it("WebSocket", jsext.func(async function (defer) {
            this.timeout(5000);
            const port = await randomPort();

            if (typeof Deno === "object") {
                const controller = new AbortController();
                Deno.serve({ port, signal: controller.signal }, req => {
                    if (req.headers.get("upgrade") != "websocket") {
                        return new Response(null, { status: 501 });
                    }
                    const { socket, response } = Deno.upgradeWebSocket(req);
                    socket.addEventListener("open", () => {
                        for (const msg of ["hello", "world"]) {
                            socket.send(msg);
                        }
                    });
                    return response;
                });
                defer(() => controller.abort());
            } else {
                const { WebSocketServer } = await import("ws");
                const server = http.createServer().listen(port);
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
            }

            let ws: WebSocket;

            if (typeof WebSocket === "function") {
                ws = new WebSocket(`ws://localhost:${port}`, "echo-protocol");
            } else {
                const dWebSocket = (await import("isomorphic-ws")).default;
                ws = new dWebSocket(`ws://localhost:${port}`, "echo-protocol") as unknown as WebSocket;
            }

            const messages: string[] = [];

            for await (const msg of toAsyncIterable<string>(ws)) {
                messages.push(msg);

                if (messages.length === 2) {
                    ws.close();
                }
            }

            deepStrictEqual(messages, ["hello", "world"]);
        }));

        it("EventTarget", async () => {
            if (typeof EventTarget !== "function") {
                return;
            }

            const target1 = new EventTarget();
            const messages: string[] = [];

            (async () => {
                await Promise.resolve(null);
                target1.dispatchEvent(new MessageEvent("message", { data: "hello" }));
                target1.dispatchEvent(new MessageEvent("message", { data: "world" }));
            })();

            for await (const msg of toAsyncIterable<string>(target1)) {
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

            for await (const msg of toAsyncIterable<string>(target2, {
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

            for await (const msg of toAsyncIterable<string>(target1)) {
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

            for await (const msg of toAsyncIterable<string>(target2, {
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

        it("promise of ReadableStream", async function () {
            if (typeof ReadableStream !== "function" || typeof Response !== "function") {
                this.skip();
            }

            const res = new Response("hello, world");
            const task = Promise.resolve(res.body!);
            const chunks: Uint8Array[] = [];

            for await (const chunk of toAsyncIterable(task)) {
                chunks.push(chunk as Uint8Array);
            }

            ok(chunks.length > 0);
        });
    });

    describe("toReadableStream", () => {
        if (typeof ReadableStream !== "function") {
            return;
        }

        it("ReadStream", async () => {
            const file = createReadStream("./package.json");
            const chunks = await readAsArray(toReadableStream(file));

            ok(chunks.length > 0);
        });

        it("EventSource", jsext.func(async (defer) => {
            const port = await randomPort();
            const server = await new Promise<http.Server>((resolve) => {
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
                }).listen(port, () => resolve(server));
            });
            defer(() => new Promise(resolve => {
                server.closeAllConnections?.();
                server.close(resolve);
            }));

            const dEventSource = typeof EventSource === "function"
                ? EventSource
                : (await import("eventsource")).default;
            const es1 = new dEventSource(`http://localhost:${port}/message`) as EventSource;
            const messages: string[] = [];

            const reader1 = toReadableStream(es1).getReader();

            while (true) {
                const { done, value } = await reader1.read();
                done || messages.push(value);

                if (done || messages.length === 2) {
                    es1.close();
                    break;
                }
            }

            deepStrictEqual(messages, ["hello", "world"]);

            const es2 = new dEventSource(`http://localhost:${port}/event`) as EventSource;
            const replies: string[] = [];

            const reader2 = toReadableStream(es2, { event: "reply" }).getReader();

            while (true) {
                const { done, value } = await reader2.read();
                done || replies.push(value);

                if (done || replies.length === 2) {
                    es2.close();
                    break;
                }
            }

            deepStrictEqual(replies, ["foo", "bar"]);
        }));

        it("WebSocket", jsext.func(async function (defer) {
            this.timeout(5000);
            const port = await randomPort();

            if (typeof Deno === "object") {
                const controller = new AbortController();
                Deno.serve({ port, signal: controller.signal }, req => {
                    if (req.headers.get("upgrade") != "websocket") {
                        return new Response(null, { status: 501 });
                    }
                    const { socket, response } = Deno.upgradeWebSocket(req);
                    socket.addEventListener("open", () => {
                        for (const msg of ["hello", "world"]) {
                            socket.send(msg);
                        }
                    });
                    return response;
                });
                defer(() => controller.abort());
            } else {
                const { WebSocketServer } = await import("ws");
                const server = http.createServer().listen(port);
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
            }

            let ws: WebSocket;

            if (typeof WebSocket === "function") {
                ws = new WebSocket(`ws://localhost:${port}`, "echo-protocol");
            } else {
                const dWebSocket = (await import("isomorphic-ws")).default;
                ws = new dWebSocket(`ws://localhost:${port}`, "echo-protocol") as unknown as WebSocket;
            }

            const messages: string[] = [];
            const reader = toReadableStream<string>(ws).getReader();

            while (true) {
                const { done, value } = await reader.read();
                done || messages.push(value);

                if (done || messages.length === 2) {
                    ws.close();
                    break;
                }
            }

            deepStrictEqual(messages, ["hello", "world"]);
        }));

        it("EventTarget", async () => {
            if (typeof EventTarget !== "function") {
                return;
            }

            const target1 = new EventTarget();
            const messages: string[] = [];

            (async () => {
                await Promise.resolve(null);
                target1.dispatchEvent(new MessageEvent("message", { data: "hello" }));
                target1.dispatchEvent(new MessageEvent("message", { data: "world" }));
            })();

            const reader1 = toReadableStream<string>(target1).getReader();

            while (true) {
                const { done, value } = await reader1.read();
                done || messages.push(value);

                if (done || messages.length === 2) {
                    target1.dispatchEvent(new Event("close"));
                    break;
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

            const reader2 = toReadableStream<string>(target2, {
                message: "reply",
                close: "end",
            }).getReader();

            while (true) {
                const { done, value } = await reader2.read();
                done || messages2.push(value);

                if (done || messages2.length === 2) {
                    target2.dispatchEvent(new Event("end"));
                    break;
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

            const reader1 = toReadableStream<string>(target1).getReader();

            while (true) {
                const { done, value } = await reader1.read();
                done || messages.push(value);

                if (done || messages.length === 2) {
                    target1.emit("close");
                    break;
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

            const reader2 = toReadableStream<string>(target2, {
                data: "reply",
                close: "end",
            }).getReader();

            while (true) {
                const { done, value } = await reader2.read();
                done || messages2.push(value);

                if (done || messages2.length === 2) {
                    target2.emit("end");
                    break;
                }
            }

            deepStrictEqual(messages2, ["foo", "bar"]);
        });

        it("promise of ReadableStream", async () => {
            const res = new Response("hello, world");
            const chunks = await readAsArray(toReadableStream(Promise.resolve(res.body!)));

            ok(chunks.length > 0);
        });
    });

    describe("resolveByteStream", () => {
        if (typeof ReadableStream === "undefined") {
            return;
        }

        it("resolve byte stream for bytes reader", async function () {
            if (typeof File === "undefined") {
                this.skip();
            }

            // File.stream() is a byte stream that supports zero-copy.
            const file = new File(["Hello, World!"], "hello.txt", { type: "text/plain" });
            const stream = resolveByteStream(Promise.resolve(file.stream()));
            const reader = stream.getReader({ mode: "byob" });
            const result: Uint8Array[] = [];

            while (true) {
                const view = new Uint8Array(8);
                const { done, value } = await reader.read(view);

                if (done) {
                    break;
                }

                result.push(value);
            }

            deepStrictEqual(result, [
                new Uint8Array([72, 101, 108, 108, 111, 44, 32, 87]),
                new Uint8Array([111, 114, 108, 100, 33])
            ]);
        });

        it("resolve byte stream for default reader", async function () {
            if (typeof File === "undefined") {
                this.skip();
            }

            // File.stream() is a byte stream that supports zero-copy.
            const file = new File(["Hello, World!"], "hello.txt", { type: "text/plain" });
            const stream = resolveByteStream(Promise.resolve(file.stream()));
            const reader = stream.getReader();
            const result: string[] = [];

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                result.push(new TextDecoder().decode(value));
            }

            deepStrictEqual(result, ["Hello, World!"]);
        });

        it("resolve default stream for bytes reader", async () => {
            const promise = Promise.resolve(toReadableStream<Uint8Array>([
                new TextEncoder().encode("Hello, World!")
            ]));
            const resolved = resolveByteStream(promise);
            const reader = resolved.getReader({ mode: "byob" });
            const result: Uint8Array[] = [];

            while (true) {
                const view = new Uint8Array(8);
                const { done, value } = await reader.read(view);

                if (done) {
                    break;
                }

                result.push(value);
            }

            deepStrictEqual(result, [
                new Uint8Array([72, 101, 108, 108, 111, 44, 32, 87]),
                new Uint8Array([111, 114, 108, 100, 33])
            ]);
        });

        it("resolve default stream for default reader", async () => {
            const promise = Promise.resolve(toReadableStream<Uint8Array>([
                new TextEncoder().encode("Hello, World!")
            ]));
            const resolved = resolveByteStream(promise);
            const reader = resolved.getReader();
            const result: string[] = [];

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                result.push(new TextDecoder().decode(value));
            }

            deepStrictEqual(result, ["Hello, World!"]);
        });
    });

    describe("concat", () => {
        it("AsyncIterable", async () => {
            const iterator1 = toAsyncIterable([1, 2, 3]);
            const iterator2 = toAsyncIterable([4, 5, 6]);
            const iterator3 = toAsyncIterable([7, 8, 9]);

            const result = await readAsArray(concat(iterator1, iterator2, iterator3));
            deepStrictEqual(result, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
        });

        it("ReadableStream", async function () {
            if (typeof ReadableStream !== "function") {
                this.skip();
            }

            const stream1 = toReadableStream([1, 2, 3]);
            const stream2 = toReadableStream([4, 5, 6]);
            const stream3 = toReadableStream([7, 8, 9]);

            const result = await readAsArray(concat(stream1, stream2, stream3));
            deepStrictEqual(result, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
        });
    });
});
