import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { asyncTask, sleep, until } from "./async.ts";
import { isBun, isDeno, isNode } from "./env.ts";
import "./index.ts";
import jsext from "./index.ts";
import { randomPort, serve } from "./http.ts";
import { withWeb } from "./http/internal.ts";
import { BunServer } from "./http/server.ts";
import { EventConsumer, EventEndpoint } from "./sse.ts";

declare const Bun: any;

describe("sse", () => {
    describe("EventEndpoint (Web APIs)", () => {
        if (typeof Request === "undefined" || typeof Response === "undefined") {
            return;
        }

        it("constructor", async () => {
            const req1 = new Request("http://localhost:8080", {
                headers: {
                    "Accept": "text/event-stream",
                },
            });
            const sse1 = new EventEndpoint(req1);
            strictEqual(sse1.lastEventId, "");
            strictEqual(sse1.closed, false);

            sse1.close();
            await until(() => sse1.closed);

            const req2 = new Request("http://localhost:8080", {
                headers: {
                    "Accept": "text/event-stream",
                    "Last-Event-ID": "123",
                },
            });
            const sse2 = new EventEndpoint(req2, { reconnectionTime: 1000 });
            strictEqual(sse2.lastEventId, "123");
            strictEqual(sse2.closed, false);

            const { response } = sse2;
            strictEqual(response!.status, 200);
            sse2.close(true);
            await until(() => sse2.closed);

            const req3 = new Request("http://localhost:8080", {
                headers: {
                    "Accept": "text/event-stream",
                    "Last-Event-ID": "123",
                },
            });
            const sse3 = new EventEndpoint(req3);
            strictEqual(sse3.lastEventId, "123");
            strictEqual(sse3.closed, true);
        });

        it("dispatchEvent", jsext.func(async function (defer) {
            const port = await randomPort();
            const task = asyncTask<InstanceType<typeof EventEndpoint>>();
            const handle = (req: Request) => {
                const sse = new EventEndpoint(req);
                task.resolve(sse);
                return sse.response;
            };

            if (isDeno) {
                const controller = new AbortController();
                Deno.serve({ port, signal: controller.signal }, handle);
                defer(() => controller.abort());
            } else if (isBun) {
                const server = Bun.serve({ port, fetch: handle });
                defer(() => server.stop(true));
            } else {
                const http = await import("node:http");
                const server = http.createServer(withWeb(handle));
                server.listen(port);
                defer(() => server.close());
            }

            if (typeof EventSource === "undefined" ||
                isBun // Bun's EventSource implementation is buggy at the moment.
            ) {
                const { EventSource } = await import("./sse.ts");
                // @ts-ignore
                globalThis.EventSource = EventSource;
            }

            const es = new EventSource(`http://localhost:${port}`);
            const messages: string[] = [];
            let lastEventId = "";

            es.addEventListener("message", (ev) => {
                const data = ev.data;
                messages.push(data);
                lastEventId = ev.lastEventId;
            });

            es.addEventListener("my-event", (ev) => {
                const data = ev.data;
                messages.push(data);
                lastEventId = ev.lastEventId;
            });

            es.addEventListener("another-event", (ev) => {
                const data = ev.data;
                messages.push(data);
                lastEventId = ev.lastEventId;
            });

            await until(() => es.readyState === EventSource.OPEN);

            const sse = await task;
            sse.dispatchEvent(new MessageEvent("message", {
                data: "Hello",
                lastEventId: "1",
            }));

            sse.dispatchEvent(new MessageEvent("my-event", {
                data: "World",
                lastEventId: "2",
            }));

            sse.dispatchEvent(new MessageEvent("another-event", {
                data: "This message has\ntwo lines.",
            }));

            await until(() => messages.length === 3);
            es.close();

            if (isBun) {
                // Bun has a bug that the readable stream is not closed when
                // when the connection is closed, so the program won't be able
                // to set the `sse.closed` to be `true`. We just wait for the
                // EventSource to be closed here instead.
                // See https://github.com/oven-sh/bun/issues/6758
                await until(() => es.readyState === EventSource.CLOSED);
            } else {
                await until(() => sse.closed);
            }

            deepStrictEqual(messages, ["Hello", "World", "This message has\ntwo lines."]);
            strictEqual(sse.lastEventId, "2");
            isBun || strictEqual(sse.closed, true);
            strictEqual(lastEventId, "2");
            strictEqual(es.readyState, EventSource.CLOSED);
        }));

        it("close", jsext.func(async function (defer) {
            const port = await randomPort();
            const task = asyncTask<InstanceType<typeof EventEndpoint>>();
            const handle = (req: Request) => {
                const sse = new EventEndpoint(req);
                task.resolve(sse);
                return sse.response;
            };

            if (isDeno) {
                const controller = new AbortController();
                Deno.serve({ port, signal: controller.signal }, handle);
                defer(() => controller.abort());
            } else if (isBun) {
                const server: BunServer = Bun.serve({ port, fetch: handle });
                defer(() => server.stop(true));
            } else {
                const http = await import("node:http");
                const server = http.createServer(withWeb(handle));
                server.listen(port);
                defer(() => server.close());
            }

            if (typeof EventSource === "undefined" ||
                isBun // Bun's EventSource implementation is buggy at the moment.
            ) {
                const { EventSource } = await import("./sse.ts");
                // @ts-ignore
                globalThis.EventSource = EventSource;
            }

            const es = new EventSource(`http://localhost:${port}`);
            defer(() => es.close());

            await until(() => es.readyState === EventSource.OPEN);

            const sse = await task;
            sse.close();
            await until(() => es.readyState === EventSource.CONNECTING);

            strictEqual(sse.closed, true);
            strictEqual(es.readyState, EventSource.CONNECTING);
        }));

        it("listen close event", jsext.func(async function (defer) {
            if (isBun) {
                // Bun has a bug that the readable stream is not closed when
                // when the connection is closed, so the program won't be able
                // to dispatch the `close` event. We just skip this test for now.
                this.skip();
            }

            let closeEvent: CloseEvent | undefined = undefined;
            const task = asyncTask<InstanceType<typeof EventEndpoint>>();
            const port = await randomPort();
            const handle = async (req: Request) => {
                const sse = new EventEndpoint(req);

                sse.addEventListener("close", (ev) => {
                    closeEvent = ev;
                });
                task.resolve(sse);

                return sse.response;
            };

            if (isDeno) {
                const controller = new AbortController();
                Deno.serve({ port, signal: controller.signal }, handle);
                defer(() => controller.abort());
            } else if (isBun) {
                const server: BunServer = Bun.serve({ port, fetch: handle });
                defer(() => server.stop(true));
            } else {
                const http = await import("node:http");
                const server = http.createServer(withWeb(handle));
                server.listen(port);
                defer(() => server.close());
            }

            if (typeof EventSource === "undefined") {
                const { EventSource } = await import("./sse.ts");
                // @ts-ignore
                globalThis.EventSource = EventSource;
            }

            const es = new EventSource(`http://localhost:${port}`);

            await until(() => es.readyState === EventSource.OPEN);
            es.close();

            const sse = await task;
            await until(() => sse.closed);
            strictEqual(sse.closed, true);
            strictEqual(es.readyState, EventSource.CLOSED);
            strictEqual(closeEvent!.type, "close");
            strictEqual(closeEvent!.wasClean, true);
        }));

        it("listen network error", jsext.func(async function (defer) {
            if (isBun) {
                // Bun has a bug that the readable stream is not closed when
                // when the connection is closed, so the program won't be able
                // to dispatch the `close` event. We just skip this test for now.
                this.skip();
            }

            let closeEvent: CloseEvent | undefined = undefined;
            const task = asyncTask<InstanceType<typeof EventEndpoint>>();
            const port = await randomPort();
            let terminate: () => Promise<any>;
            const handle = async (req: Request) => {
                const sse = new EventEndpoint(req);

                sse.addEventListener("close", (ev) => {
                    closeEvent = ev;
                });
                task.resolve(sse);

                return sse.response;
            };

            if (isDeno) {
                const controller = new AbortController();
                Deno.serve({ port, signal: controller.signal }, handle);
                defer(() => controller.abort());
            } else if (isBun) {
                const server: BunServer = Bun.serve({ port, fetch: handle });
                defer(() => server.stop(true));
            } else {
                const http = await import("node:http");
                const server = http.createServer(withWeb(handle));
                server.listen(port);
                defer(() => server.close());
            }

            if (isDeno || isBun) {
                const worker = new Worker(new URL("./examples/sse.js", import.meta.url), {
                    type: "module",
                });

                worker.postMessage({ type: "client", port });
                await new Promise<void>(resolve => {
                    worker.onmessage = ({ data }) => {
                        if (data === "ready") {
                            resolve();
                        }
                    };
                });
                terminate = () => Promise.resolve(worker.terminate());
            } else {
                const { Worker } = await import("node:worker_threads");
                const worker = new Worker(new URL("./examples/sse.js", import.meta.url));

                worker.postMessage({ type: "client", port });
                await new Promise<void>(resolve => {
                    worker.on("message", (data) => {
                        if (data === "ready") {
                            resolve();
                        }
                    });
                });
                terminate = () => worker.terminate();
            }

            const sse = await task;
            await terminate();
            await until(() => sse.closed);

            strictEqual(closeEvent!.type, "close");
            strictEqual(closeEvent!.wasClean, true);
        }));
    });

    describe("EventEndpoint (Node.js APIs)", () => {
        if (!isNode || typeof fetch === "undefined") {
            return;
        }

        it("constructor", async () => {
            const http = await import("node:http");

            const task1 = asyncTask<InstanceType<typeof EventEndpoint>>();
            const server1 = http.createServer((req, res) => {
                const sse = new EventEndpoint(req, res);
                task1.resolve(sse);
            });
            const port1 = await randomPort();
            await new Promise<void>(resolve => server1.listen(port1, resolve));

            await fetch(`http://localhost:${port1}`, {
                headers: {
                    "Accept": "text/event-stream",
                },
            });

            const sse1 = await task1;
            strictEqual(sse1.lastEventId, "");
            strictEqual(sse1.closed, false);

            sse1.close();
            await until(() => sse1.closed);
            server1.close();

            const task2 = asyncTask<InstanceType<typeof EventEndpoint>>();
            const server2 = http.createServer((req, res) => {
                const sse = new EventEndpoint(req, res, { reconnectionTime: 1000 });
                task2.resolve(sse);
            });
            const port2 = await randomPort();
            server2.listen(port2);

            await fetch(`http://localhost:${port2}`, {
                headers: {
                    "Accept": "text/event-stream",
                    "Last-Event-ID": "123",
                },
            });

            const sse2 = await task2;
            strictEqual(sse2.lastEventId, "123");
            strictEqual(sse2.closed, false);

            sse2.close(true);
            await until(() => sse2.closed);
            server2.close();


            const task3 = asyncTask<InstanceType<typeof EventEndpoint>>();
            const server3 = http.createServer((req, res) => {
                const sse = new EventEndpoint(req, res);
                task3.resolve(sse);
            });
            const port3 = await randomPort();
            server3.listen(port3);

            await fetch(`http://localhost:${port3}`, {
                headers: {
                    "Accept": "text/event-stream",
                    "Last-Event-ID": "123",
                },
            });

            const sse3 = await task3;
            strictEqual(sse3.lastEventId, "123");
            strictEqual(sse3.closed, true);

            server3.close();
        });

        it("dispatchEvent", jsext.func(async function (defer) {
            const http = await import("node:http");
            const { EventSource } = await import("./sse.ts");

            const task = asyncTask<InstanceType<typeof EventEndpoint>>();
            const server = http.createServer((req, res) => {
                const sse = new EventEndpoint(req, res);
                task.resolve(sse);
            });
            const port = await randomPort();
            server.listen(port);
            defer(() => Promise.race([server.close(), sleep(100)]));

            const es = new EventSource(`http://localhost:${port}`);
            const messages: string[] = [];
            let lastEventId = "";

            es.addEventListener("message", (ev) => {
                const data = ev.data;
                messages.push(data);
                lastEventId = ev.lastEventId;
            });

            es.addEventListener("my-event", (ev) => {
                const data = ev.data;
                messages.push(data);
                lastEventId = ev.lastEventId;
            });

            es.addEventListener("another-event", (ev) => {
                const data = ev.data;
                messages.push(data);
                lastEventId = ev.lastEventId;
            });

            await until(() => es.readyState === EventSource.OPEN);

            const sse = await task;
            sse.dispatchEvent(new MessageEvent("message", {
                data: "Hello",
                lastEventId: "1",
            }));

            sse.dispatchEvent(new MessageEvent("my-event", {
                data: "World",
                lastEventId: "2",
            }));

            sse.dispatchEvent(new MessageEvent("another-event", {
                data: "This message has\ntwo lines.",
            }));

            await until(() => messages.length === 3);
            es.close();
            await until(() => sse.closed);

            deepStrictEqual(messages, ["Hello", "World", "This message has\ntwo lines."]);
            strictEqual(sse.lastEventId, "2");
            strictEqual(sse.closed, true);
            strictEqual(lastEventId, "2");
            strictEqual(es.readyState, EventSource.CLOSED);
        }));

        it("close", jsext.func(async function (defer) {
            const http = await import("node:http");
            const { EventSource } = await import("./sse.ts");

            const task = asyncTask<InstanceType<typeof EventEndpoint>>();
            const server = http.createServer((req, res) => {
                const sse = new EventEndpoint(req, res);
                task.resolve(sse);
            });
            const port = await randomPort();
            server.listen(port);
            defer(() => Promise.race([server.close(), sleep(100)]));

            const es = new EventSource(`http://localhost:${port}`);
            defer(() => es.close());

            await until(() => es.readyState === EventSource.OPEN);

            const sse = await task;
            sse.close();
            await until(() => es.readyState === EventSource.CONNECTING);

            strictEqual(sse.closed, true);
            strictEqual(es.readyState, EventSource.CONNECTING);
        }));

        it("listen close event", jsext.func(async function (defer) {
            const http = await import("node:http");
            const { EventSource } = await import("./sse.ts");

            let closeEvent: CloseEvent | undefined = undefined;
            const task = asyncTask<InstanceType<typeof EventEndpoint>>();
            const server = http.createServer((req, res) => {
                const sse = new EventEndpoint(req, res);
                const listener = (ev: CloseEvent) => {
                    closeEvent = ev;
                    sse.removeEventListener("close", listener);
                };

                sse.addEventListener("close", listener);

                task.resolve(sse);
            });
            const port = await randomPort();
            server.listen(port);
            defer(() => Promise.race([server.close(), sleep(100)]));

            const es = new EventSource(`http://localhost:${port}`);
            const sse = await task;

            await until(() => es.readyState === EventSource.OPEN);
            es.close();
            await until(() => sse.closed);
            strictEqual(sse.closed, true);
            strictEqual(es.readyState, EventSource.CLOSED);
            strictEqual(closeEvent!.type, "close");
            strictEqual(closeEvent!.wasClean, true);
        }));

        it("listen network error", jsext.func(async function (defer) {
            let closeEvent: CloseEvent | undefined = undefined;
            const task = asyncTask<InstanceType<typeof EventEndpoint>>();
            const port = await randomPort();
            const http = await import("node:http");
            const server = http.createServer((req, res) => {
                const sse = new EventEndpoint(req, res);

                sse.addEventListener("close", (ev) => {
                    closeEvent = ev;
                });
                task.resolve(sse);
            });
            server.listen(port);
            defer(() => server.close());

            const { Worker } = await import("node:worker_threads");
            const worker = new Worker(new URL("./examples/sse.js", import.meta.url));

            worker.postMessage({ type: "client", port });
            await new Promise<void>(resolve => {
                worker.on("message", (data) => {
                    if (data === "ready") {
                        resolve();
                    }
                });
            });

            const sse = await task;
            await worker.terminate();
            await until(() => sse.closed);

            strictEqual(closeEvent!.type, "close");
            strictEqual(closeEvent!.wasClean, true);
        }));
    });

    async function openEventEndpoint(options: {
        port?: number | undefined;
        defer: (fn: () => any | Promise<any>) => void;
        onOpen: (sse: EventEndpoint) => void;
    }): Promise<{
        port: number;
        getSSE: () => Promise<EventEndpoint>;
    }> {
        const port = options.port || await randomPort();
        let sse: EventEndpoint | undefined = undefined;

        if (isBun) {
            const server: BunServer = Bun.serve({
                port,
                fetch: async (req: Request) => {
                    sse = new EventEndpoint(req);
                    setTimeout(() => {
                        options.onOpen(sse!);
                    });
                    return sse.response!;
                },
            });
            options.defer(() => server.stop(true));
        } else if (isDeno) {
            const controller = new AbortController();
            Deno.serve({ port, signal: controller.signal }, req => {
                sse = new EventEndpoint(req);
                queueMicrotask(() => {
                    options.onOpen(sse!);
                });
                return sse.response!;
            });
            options.defer(() => controller.abort());
        } else {
            const http = await import("node:http");
            const server = http.createServer((req, res) => {
                sse = new EventEndpoint(req, res);
                queueMicrotask(() => {
                    options.onOpen(sse!);
                });
            });
            server.listen(port);
            options.defer(() => {
                server?.closeAllConnections();
                server.close();
            });
        }

        return {
            port,
            getSSE: async () => {
                return await until(() => sse);
            },
        };
    }

    describe("EventSource", () => {
        if (typeof fetch !== "function") {
            return;
        }

        it("open connection", jsext.func(async (defer) => {
            const { EventSource } = await import("./sse.ts");
            const { port } = await openEventEndpoint({
                defer,
                onOpen() { }
            });

            const es1 = new EventSource("http://localhost:" + port);
            defer(() => es1.close());

            strictEqual(String(es1), "[object EventSource]");
            strictEqual(es1.url, "http://localhost:" + port + "/");
            strictEqual(es1.readyState, EventSource.CONNECTING);
            strictEqual(es1.withCredentials, false);

            if (isNode) {
                // @ts-ignore
                strictEqual((es1[Symbol.for("request")] as Request).credentials, "same-origin");
            }

            const openEvent1 = await new Promise<Event>(resolve => {
                es1.onopen = resolve;
            });

            strictEqual(es1.readyState, EventSource.OPEN);
            strictEqual(openEvent1.type, "open");

            const es2 = new EventSource("http://localhost:" + port, {
                withCredentials: true,
            });
            defer(() => es2.close());

            strictEqual(String(es1), "[object EventSource]");
            strictEqual(es2.url, "http://localhost:" + port + "/");
            strictEqual(es2.readyState, EventSource.CONNECTING);
            strictEqual(es2.withCredentials, true);

            if (isNode) {
                // @ts-ignore
                strictEqual((es2[Symbol.for("request")] as Request).credentials, "include");
            }

            const openEvent2 = await new Promise<Event>(resolve => {
                es2.addEventListener("open", resolve);
            });

            strictEqual(es2.readyState, EventSource.OPEN);
            strictEqual(openEvent2.type, "open");
        }));

        it("close connection", jsext.func(async function (defer) {
            if (isBun) {
                // Bun has a bug that the readable stream is not closed when
                // when the connection is closed, so the program won't be able
                // to dispatch the `close` event. We just skip this test for now.
                this.skip();
            }

            const { EventSource } = await import("./sse.ts");
            const { port, getSSE } = await openEventEndpoint({
                defer,
                onOpen() { }
            });

            const es = new EventSource("http://localhost:" + port);

            await new Promise(resolve => {
                es.onopen = resolve;
            });
            strictEqual(es.readyState, EventSource.OPEN);

            es.close();

            const sse = await getSSE();
            await until(() => sse.closed);

            strictEqual(sse.closed, true);
            strictEqual(es.readyState, EventSource.CLOSED);
        }));

        it("server close and reconnect", jsext.func(async function (defer) {
            this.timeout(5_000);

            const { EventSource } = await import("./sse.ts");
            const { port, getSSE } = await openEventEndpoint({
                defer,
                onOpen(sse) {
                    setTimeout(() => {
                        sse.closed || sse.close();
                    }, 500);
                }
            });

            const es = new EventSource("http://localhost:" + port);
            defer(() => es.close());

            let openEvents: Event[] = [];
            let errorEvent: ErrorEvent | undefined = undefined;
            let errorEvent_dup: ErrorEvent | undefined = undefined;

            es.addEventListener("open", ev => {
                openEvents.push(ev);
            });
            es.addEventListener("error", ev => {
                errorEvent = ev;
            });
            es.onerror = ev => {
                errorEvent_dup = ev;
            };

            strictEqual(es.readyState, EventSource.CONNECTING);
            await new Promise(resolve => {
                es.onopen = resolve;
            });
            strictEqual(es.readyState, EventSource.OPEN);
            strictEqual(openEvents.length, 1);

            const sse = await getSSE();
            await until(() => sse.closed);

            await until(() => es.readyState === EventSource.CONNECTING);
            strictEqual(es.readyState, EventSource.CONNECTING);
            strictEqual(errorEvent!.type, "error");
            strictEqual(errorEvent_dup!.type, "error");

            await until(() => es.readyState === EventSource.OPEN);
            strictEqual(es.readyState, EventSource.OPEN);
            ok(openEvents.length >= 2);
        }));

        it("network error and reconnect", jsext.func(async function (defer) {
            this.timeout(5_000);
            const port = await randomPort();
            let terminate: () => Promise<any>;

            if (isDeno || isBun) {
                const worker = new Worker(new URL("./examples/sse.js", import.meta.url), {
                    type: "module",
                });

                worker.postMessage({ type: "server", port });
                await new Promise<void>(resolve => {
                    worker.onmessage = ({ data }) => {
                        if (data === "ready") {
                            resolve();
                        }
                    };
                });
                terminate = () => Promise.resolve(worker.terminate());
            } else {
                const { Worker } = await import("node:worker_threads");
                const worker = new Worker(new URL("./examples/sse.js", import.meta.url));

                worker.postMessage({ type: "server", port });
                await new Promise<void>(resolve => {
                    worker.on("message", (data) => {
                        if (data === "ready") {
                            resolve();
                        }
                    });
                });
                terminate = () => worker.terminate();
            }

            const { EventSource } = await import("./sse.ts");
            const es = new EventSource("http://localhost:" + port);
            defer(() => es.close());

            let errorEvent: ErrorEvent | undefined = undefined;
            let errorEvent_dup: ErrorEvent | undefined = undefined;

            es.addEventListener("error", ev => {
                errorEvent = ev;
            });
            es.onerror = ev => {
                errorEvent_dup = ev;
            };

            strictEqual(es.readyState, EventSource.CONNECTING);
            await new Promise(resolve => {
                es.onopen = resolve;
            });
            strictEqual(es.readyState, EventSource.OPEN);

            await terminate();
            await until(() => es.readyState === EventSource.CONNECTING);

            strictEqual(es.readyState, EventSource.CONNECTING);
            strictEqual(errorEvent!.type, "error");
            strictEqual(errorEvent_dup!.type, "error");
        }));

        it("retry connection multiple times", jsext.func(async function (defer) {
            this.timeout(10_000);

            const { EventSource } = await import("./sse.ts");
            const port = await randomPort();
            const es = new EventSource("http://localhost:" + port);
            defer(() => es.close());

            const errorEvents: ErrorEvent[] = [];

            es.addEventListener("error", ev => {
                errorEvents.push(ev);
            });

            await until(() => errorEvents.length === 1);
            if (String(errorEvents[0]?.error).includes("502")) {
                this.skip(); // This could happen in Bun.
            }

            await until(() => errorEvents.length === 2);

            await openEventEndpoint({
                port,
                defer,
                onOpen() { }
            });

            await until(() => es.readyState === EventSource.OPEN);
            strictEqual(es.url, "http://localhost:" + port + "/");
            strictEqual(es.readyState, EventSource.OPEN);
        }));

        it("listen message event", jsext.func(async (defer) => {
            const { EventSource } = await import("./sse.ts");
            const { port } = await openEventEndpoint({
                defer,
                onOpen(sse) {
                    sse.dispatchEvent(new MessageEvent("message", {
                        data: "Hello",
                        lastEventId: "1",
                    }));
                    sse.dispatchEvent(new MessageEvent("message", {
                        data: "World",
                        lastEventId: "2",
                    }));
                    sse.dispatchEvent(new MessageEvent("message", {
                        data: "This message has\ntwo lines.",
                    }));
                }
            });

            const es = new EventSource("http://localhost:" + port);
            defer(() => es.close());

            const messages: string[] = [];
            let lastEventId = "";

            es.addEventListener("message", (ev) => {
                const data = ev.data;
                messages.push(data);
                lastEventId = ev.lastEventId;
            });

            await until(() => messages.length === 3);

            deepStrictEqual(messages, ["Hello", "World", "This message has\ntwo lines."]);
            strictEqual(lastEventId, "2");
        }));

        it("use onmessage property", jsext.func(async (defer) => {
            const { EventSource } = await import("./sse.ts");
            const { port } = await openEventEndpoint({
                defer,
                onOpen(sse) {
                    sse.dispatchEvent(new MessageEvent("message", {
                        data: "Hello",
                        lastEventId: "1",
                    }));
                    sse.dispatchEvent(new MessageEvent("message", {
                        data: "World",
                        lastEventId: "2",
                    }));
                    sse.dispatchEvent(new MessageEvent("message", {
                        data: "This message has\ntwo lines.",
                    }));
                }
            });

            const es = new EventSource("http://localhost:" + port);
            defer(() => es.close());

            const messages: string[] = [];
            let lastEventId = "";

            es.onmessage = (ev) => {
                const data = ev.data;
                messages.push(data);
                lastEventId = ev.lastEventId;
            };

            await until(() => messages.length === 3);

            deepStrictEqual(messages, ["Hello", "World", "This message has\ntwo lines."]);
            strictEqual(lastEventId, "2");
        }));

        it("listen custom event", jsext.func(async (defer) => {
            const { EventSource } = await import("./sse.ts");
            const { port } = await openEventEndpoint({
                defer,
                onOpen(sse) {
                    sse.dispatchEvent(new MessageEvent("my-event", {
                        data: "Hi",
                        lastEventId: "3",
                    }));
                    sse.dispatchEvent(new MessageEvent("my-event", {
                        data: "A-yon",
                        lastEventId: "4",
                    }));
                    sse.dispatchEvent(new MessageEvent("my-event", {
                        data: "This message has\ntwo lines.",
                    }));
                }
            });

            const es = new EventSource("http://localhost:" + port);
            defer(() => es.close());

            const messages: string[] = [];
            let lastEventId = "";

            es.addEventListener("my-event", (ev) => {
                const data = ev.data;
                messages.push(data);
                lastEventId = ev.lastEventId;
            });

            await until(() => messages.length === 3);

            deepStrictEqual(messages, ["Hi", "A-yon", "This message has\ntwo lines."]);
            strictEqual(lastEventId, "4");
        }));

        it("handle 204 response", jsext.func(async (defer) => {
            const { EventSource } = await import("./sse.ts");
            const port = await randomPort();
            const server = serve({
                port,
                fetch(_req) {
                    return new Response(null, { status: 204 });
                }
            });
            defer(() => server.close(true));
            await server.ready;

            const es = new EventSource("http://localhost:" + port);
            defer(() => es.close());

            let errorEvent: Event | undefined = undefined;
            es.addEventListener("error", ev => {
                errorEvent = ev;
            });

            await until(() => es.readyState === EventSource.CLOSED);
            strictEqual(errorEvent, undefined);
            strictEqual(es.readyState, EventSource.CLOSED);
        }));

        it("handle non-200 response", jsext.func(async (defer) => {
            const { EventSource } = await import("./sse.ts");
            const port = await randomPort();
            const server = serve({
                port,
                fetch(_req) {
                    return new Response("Not Found", { status: 400 });
                }
            });
            defer(() => server.close(true));
            await server.ready;

            const es = new EventSource("http://localhost:" + port);
            defer(() => es.close());

            let errorEvent: Event | undefined = undefined;
            es.addEventListener("error", ev => {
                errorEvent = ev;
            });

            await until(() => errorEvent);
            strictEqual(errorEvent!.type, "error");
            strictEqual(es.readyState, EventSource.CLOSED);
        }));

        it("handle non-event-stream response", jsext.func(async (defer) => {
            const { EventSource } = await import("./sse.ts");
            const port = await randomPort();
            const server = serve({
                port,
                fetch(_req) {
                    return new Response("Hello, World!", { status: 200 });
                }
            });
            defer(() => server.close(true));
            await server.ready;

            const es = new EventSource("http://localhost:" + port);
            defer(() => es.close());

            let errorEvent: Event | undefined = undefined;
            es.addEventListener("error", ev => {
                errorEvent = ev;
            });

            await until(() => errorEvent);
            strictEqual(errorEvent!.type, "error");
            strictEqual(es.readyState, EventSource.CLOSED);
        }));
    });

    describe("EventConsumer", () => {
        if (typeof fetch !== "function") {
            return;
        }

        it("listen message event", jsext.func(async (defer) => {
            const { port, getSSE } = await openEventEndpoint({
                defer,
                onOpen(sse) {
                    sse.dispatchEvent(new MessageEvent("message", {
                        data: "Hello",
                        lastEventId: "1",
                    }));
                    sse.dispatchEvent(new MessageEvent("message", {
                        data: "World",
                        lastEventId: "2",
                    }));
                    sse.dispatchEvent(new MessageEvent("message", {
                        data: "This message has\ntwo lines.",
                    }));

                    setTimeout(() => {
                        sse.close();
                    });
                }
            });

            const res = await fetch(`http://localhost:${port}`, {
                headers: {
                    "Accept": "text/event-stream",
                },
            });
            const client = new EventConsumer(res);
            const messages: string[] = [];
            let lastEventId = "";

            client.addEventListener("message", (ev) => {
                const data = ev.data;
                messages.push(data);
                lastEventId = ev.lastEventId;
            });

            await until(() => client.closed);

            deepStrictEqual(messages, ["Hello", "World", "This message has\ntwo lines."]);

            const sse = await getSSE();
            strictEqual(sse.lastEventId, "2");
            strictEqual(client.lastEventId, "2");
            strictEqual(sse.closed, true);
            strictEqual(client.closed, true);
            strictEqual(lastEventId, "2");
        }));

        it("listen custom event", jsext.func(async (defer) => {
            const { port, getSSE } = await openEventEndpoint({
                defer,
                onOpen(sse) {
                    sse.dispatchEvent(new MessageEvent("my-event", {
                        data: "Hi",
                        lastEventId: "3",
                    }));
                    sse.dispatchEvent(new MessageEvent("my-event", {
                        data: "A-yon",
                        lastEventId: "4",
                    }));
                    sse.dispatchEvent(new MessageEvent("my-event", {
                        data: "This message has\ntwo lines.",
                    }));

                    setTimeout(() => {
                        sse.close();
                    });
                }
            });

            const res = await fetch(`http://localhost:${port}`, {
                headers: {
                    "Accept": "text/event-stream",
                },
            });
            const client = new EventConsumer(res);
            const messages: string[] = [];
            let lastEventId = "";

            client.addEventListener("my-event", (ev) => {
                const data = ev.data;
                messages.push(data);
                lastEventId = ev.lastEventId;
            });

            await until(() => client.closed);

            deepStrictEqual(messages, ["Hi", "A-yon", "This message has\ntwo lines."]);

            const sse = await getSSE();
            strictEqual(sse.lastEventId, "4");
            strictEqual(client.lastEventId, "4");
            strictEqual(sse.closed, true);
            strictEqual(client.closed, true);
            strictEqual(lastEventId, "4");
        }));

        it("listen close event", jsext.func(async (defer) => {
            const { port, getSSE } = await openEventEndpoint({
                defer,
                onOpen(sse) {
                    sse.close();
                }
            });

            const res = await fetch(`http://localhost:${port}`, {
                headers: {
                    "Accept": "text/event-stream",
                },
            });
            const client = new EventConsumer(res);
            let closeEvent: CloseEvent | undefined = undefined;

            client.addEventListener("close", ev => {
                closeEvent = ev;
            });

            await until(() => client.closed);

            const sse = await getSSE();
            strictEqual(sse.closed, true);
            strictEqual(client.closed, true);
            strictEqual(closeEvent!.type, "close");
            strictEqual(closeEvent!.wasClean, true);
        }));

        it("close by the client", jsext.func(async function (defer) {
            if (isBun) {
                // Bun has a bug that the readable stream is not closed when
                // when the connection is closed, so the program won't be able
                // to dispatch the `close` event. We just skip this test for now.
                this.skip();
            }

            const { port, getSSE } = await openEventEndpoint({
                defer,
                onOpen() { }
            });

            const controller = new AbortController();
            const res = await fetch(`http://localhost:${port}`, {
                headers: {
                    "Accept": "text/event-stream",
                },
                signal: controller.signal,
            });
            const client = new EventConsumer(res);
            let closeEvent: CloseEvent | undefined = undefined;

            client.addEventListener("close", ev => {
                closeEvent = ev;
            });

            controller.abort();

            const sse = await getSSE();
            await until(() => sse.closed);

            strictEqual(sse!.closed, true);
            strictEqual(client.closed, true);
            strictEqual(closeEvent!.type, "close");
            strictEqual(closeEvent!.wasClean, false);
        }));

        it("listen network error", jsext.func(async function () {
            if (isBun) {
                this.skip(); // Bun is buggy here, the worker is not working.
            }

            const port = await randomPort();
            let terminate: () => Promise<any>;

            if (isDeno || isBun) {
                const worker = new Worker(new URL("./examples/sse.js", import.meta.url), {
                    type: "module",
                });

                worker.postMessage({ type: "server", port });
                await new Promise<void>(resolve => {
                    worker.onmessage = ({ data }) => {
                        if (data === "ready") {
                            resolve();
                        }
                    };
                });
                terminate = () => Promise.resolve(worker.terminate());
            } else {
                const { Worker } = await import("node:worker_threads");
                const worker = new Worker(new URL("./examples/sse.js", import.meta.url));

                worker.postMessage({ type: "server", port });
                await new Promise<void>(resolve => {
                    worker.on("message", (data) => {
                        if (data === "ready") {
                            resolve();
                        }
                    });
                });
                terminate = () => worker.terminate();
            }

            const res = await fetch("http://localhost:" + port);
            const client = new EventConsumer(res);
            let errorEvent: Event | undefined = undefined;
            let closeEvent: CloseEvent | undefined = undefined;

            client.addEventListener("error", ev => {
                errorEvent = ev;
            });
            client.addEventListener("close", ev => {
                closeEvent = ev;
            });

            await terminate();
            await until(() => client.closed);

            strictEqual(client.closed, true);
            strictEqual(errorEvent!.type, "error");
            strictEqual(closeEvent!.type, "close");
            strictEqual(closeEvent!.wasClean, false);
            strictEqual(typeof closeEvent!.reason, "string");
        }));
    });
});
