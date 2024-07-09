import { deepStrictEqual, strictEqual } from "node:assert";
import { asyncTask, sleep, until } from "./async.ts";
import { isBun, isDeno, isNode } from "./env.ts";
import "./index.ts";
import jsext from "./index.ts";
import { randomPort, withWeb } from "./http.ts";
import { EventClient, EventEndpoint } from "./sse.ts";

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

            if (isDeno) {
                const controller = new AbortController();
                Deno.serve({ port, signal: controller.signal }, req => {
                    const sse = new EventEndpoint(req);
                    task.resolve(sse);
                    return sse.response!;
                });
                defer(() => controller.abort());
            } else if (isBun) {
                const server = Bun.serve({
                    port,
                    fetch: async (req: Request) => {
                        const sse = new EventEndpoint(req);
                        task.resolve(sse);
                        return sse.response!;
                    },
                });
                defer(() => server.stop(true));
            } else {
                const http = await import("node:http");
                const server = http.createServer(withWeb(async (req) => {
                    const sse = new EventEndpoint(req);
                    task.resolve(sse);
                    return sse.response!;
                }));
                server.listen(port);
                defer(() => server.close());
            }

            if (typeof EventSource === "undefined") {
                const { default: dEventSource } = await import("eventsource");
                globalThis.EventSource = dEventSource as any;
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

            if (isDeno) {
                const controller = new AbortController();
                Deno.serve({ port, signal: controller.signal }, req => {
                    const sse = new EventEndpoint(req);
                    task.resolve(sse);
                    return sse.response!;
                });
                defer(() => controller.abort());
            } else if (isBun) {
                const server = Bun.serve({
                    port,
                    fetch: async (req: Request) => {
                        const sse = new EventEndpoint(req);
                        task.resolve(sse);
                        return sse.response!;
                    },
                });
                defer(() => server.stop(true));
            } else {
                const http = await import("node:http");
                const server = http.createServer(withWeb(async (req) => {
                    const sse = new EventEndpoint(req);
                    task.resolve(sse);
                    return sse.response!;
                }));
                server.listen(port);
                defer(() => server.close());
            }

            if (typeof EventSource === "undefined") {
                const { default: dEventSource } = await import("eventsource");
                globalThis.EventSource = dEventSource as any;
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

            if (isDeno) {
                const controller = new AbortController();
                Deno.serve({ port, signal: controller.signal }, req => {
                    const sse = new EventEndpoint(req);

                    sse.addEventListener("close", _ev => {
                        closeEvent = _ev as CloseEvent;
                    });

                    task.resolve(sse);
                    return sse.response!;
                });
                defer(() => controller.abort());
            } else if (isBun) {
                const server = Bun.serve({
                    port,
                    fetch: async (req: Request) => {
                        const sse = new EventEndpoint(req);

                        sse.addEventListener("close", _ev => {
                            closeEvent = _ev as CloseEvent;
                        });

                        task.resolve(sse);
                        return sse.response!;
                    },
                });
                defer(() => server.stop(true));
            } else {
                const http = await import("node:http");
                const server = http.createServer(withWeb(async (req) => {
                    const sse = new EventEndpoint(req);

                    sse.addEventListener("close", _ev => {
                        closeEvent = _ev as CloseEvent;
                    });

                    task.resolve(sse);
                    return sse.response!;
                }));
                server.listen(port);
                defer(() => server.close());
            }

            if (typeof EventSource === "undefined") {
                const { default: dEventSource } = await import("eventsource");
                globalThis.EventSource = dEventSource as any;
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
    });

    describe("EventEndpoint (Node.js APIs)", () => {
        if (!isNode || typeof WritableStream === "undefined") {
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
            const { default: EventSource } = await import("eventsource");

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
            const { default: EventSource } = await import("eventsource");

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
            const { default: EventSource } = await import("eventsource");

            let closeEvent: CloseEvent | undefined = undefined;
            const task = asyncTask<InstanceType<typeof EventEndpoint>>();
            const server = http.createServer((req, res) => {
                const sse = new EventEndpoint(req, res);

                sse.addEventListener("close", _ev => {
                    closeEvent = _ev as CloseEvent;
                });

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
    });

    describe("EventClient", () => {
        if (typeof Request === "undefined" || typeof Response === "undefined") {
            return;
        }

        it("listen message event", async () => {
            const req = new Request("http://localhost:8080", {
                headers: {
                    "Accept": "text/event-stream",
                },
            });
            const sse = new EventEndpoint(req);
            strictEqual(sse.closed, false);
            const { response } = sse;

            const client = new EventClient(response!);
            const messages: string[] = [];
            let lastEventId = "";

            client.addEventListener("message", (ev) => {
                const data = ev.data;
                messages.push(data);
                lastEventId = ev.lastEventId;
            });

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

            await until(() => messages.length === 3);
            client.close();
            await until(() => sse.closed);

            deepStrictEqual(messages, ["Hello", "World", "This message has\ntwo lines."]);
            strictEqual(sse.lastEventId, "2");
            strictEqual(client.lastEventId, "2");
            strictEqual(sse.closed, true);
            strictEqual(client.closed, true);
            strictEqual(lastEventId, "2");
        });

        it("listen custom event", async () => {
            const req = new Request("http://localhost:8080", {
                headers: {
                    "Accept": "text/event-stream",
                },
            });
            const sse = new EventEndpoint(req);
            strictEqual(sse.closed, false);
            const { response } = sse;

            const client = new EventClient(response!);
            const messages: string[] = [];
            let lastEventId = "";

            client.addEventListener("my-event", (ev) => {
                const data = ev.data;
                messages.push(data);
                lastEventId = ev.lastEventId;
            });

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

            await until(() => messages.length === 3);
            client.close();
            await until(() => sse.closed);

            deepStrictEqual(messages, ["Hi", "A-yon", "This message has\ntwo lines."]);
            strictEqual(sse.lastEventId, "4");
            strictEqual(client.lastEventId, "4");
            strictEqual(sse.closed, true);
            strictEqual(client.closed, true);
            strictEqual(lastEventId, "4");
        });

        it("listen close event by the server", async () => {
            const req = new Request("http://localhost:8080", {
                headers: {
                    "Accept": "text/event-stream",
                },
            });
            const sse = new EventEndpoint(req);
            strictEqual(sse.closed, false);
            const { response } = sse;

            const client = new EventClient(response!);
            let closeEvent: CloseEvent | undefined = undefined;

            client.addEventListener("close", _ev => {
                closeEvent = _ev as CloseEvent;
            });

            sse.close();
            await until(() => client.closed);

            strictEqual(sse.closed, true);
            strictEqual(client.closed, true);
            strictEqual(closeEvent!.type, "close");
            strictEqual(closeEvent!.wasClean, true);
        });

        it("listen close event by the client", async () => {
            const req = new Request("http://localhost:8080", {
                headers: {
                    "Accept": "text/event-stream",
                },
            });
            const sse = new EventEndpoint(req);
            strictEqual(sse.closed, false);
            const { response } = sse;

            const client = new EventClient(response!);
            let closeEvent: CloseEvent | undefined = undefined;

            client.addEventListener("close", _ev => {
                closeEvent = _ev as CloseEvent;
            });

            client.close();
            await until(() => client.closed);

            strictEqual(sse.closed, true);
            strictEqual(client.closed, true);
            strictEqual(closeEvent!.type, "close");
            strictEqual(closeEvent!.wasClean, true);
        });

        it("listen error event", jsext.func(async function () {
            if (!isDeno) {
                this.skip();
            }

            const { EventClient } = await import("./sse.ts");

            const worker = new Worker(new URL("./examples/sse-deno.ts", import.meta.url), {
                type: "module",
            });

            await new Promise<void>(resolve => {
                worker.onmessage = ({ data }) => {
                    if (data === "ready") {
                        resolve();
                    }
                };
            });

            const res = await fetch("http://localhost:8082");

            const client = new EventClient(res);
            let errorEvent: Event | undefined = undefined;
            let closeEvent: CloseEvent | undefined = undefined;

            client.addEventListener("error", _ev => {
                errorEvent = _ev;
            });

            client.addEventListener("close", _ev => {
                closeEvent = _ev as CloseEvent;
            });

            worker.terminate();
            await until(() => client.closed);

            strictEqual(client.closed, true);
            strictEqual(errorEvent!.type, "error");
            strictEqual(closeEvent!.type, "close");
            strictEqual(closeEvent!.wasClean, false);
            strictEqual(typeof closeEvent!.reason, "string");
        }));
    });
});
