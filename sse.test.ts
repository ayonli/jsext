import { deepStrictEqual, strictEqual } from "node:assert";
import { sleep, until } from "./async.ts";
import { isDeno, isNode } from "./env.ts";
import "./index.ts";
import jsext from "./index.ts";
import { randomPort } from "./http.ts";

describe("sse", () => {
    describe("SSE (Web APIs)", () => {
        if (typeof EventTarget === "undefined" ||
            typeof Request === "undefined" ||
            typeof Response === "undefined"
        ) {
            return;
        }

        it("constructor", async () => {
            const { SSE } = await import("./sse.ts");

            const req1 = new Request("http://localhost:8080", {
                headers: {
                    "Accept": "text/event-stream",
                },
            });
            const sse1 = new SSE(req1);
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
            const sse2 = new SSE(req2, { reconnectionTime: 1000 });
            strictEqual(sse2.lastEventId, "123");
            strictEqual(sse2.closed, false);

            const { response } = sse2;
            strictEqual(response!.status, 200);
            sse2.close();
            await until(() => sse2.closed);

            const req3 = new Request("http://localhost:8080", {
                headers: {
                    "Accept": "text/event-stream",
                    "Last-Event-ID": "123",
                },
            });
            const sse3 = new SSE(req3);
            strictEqual(sse3.lastEventId, "123");
            strictEqual(sse3.closed, true);
        });

        it("dispatchEvent", jsext.func(async function (defer) {
            if (!isDeno) {
                this.skip();
            }

            const { SSE } = await import("./sse.ts");
            const port = await randomPort();

            let sse: InstanceType<typeof SSE> | undefined = undefined;
            const server = Deno.serve({ port }, req => {
                sse = new SSE(req);
                return sse.response!;
            });
            defer(() => Promise.race([server.shutdown(), sleep(100)]));

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

            sse!.dispatchEvent(new MessageEvent("message", {
                data: "Hello",
                lastEventId: "1",
            }));

            sse!.dispatchEvent(new MessageEvent("my-event", {
                data: "World",
                lastEventId: "2",
            }));

            sse!.dispatchEvent(new MessageEvent("another-event", {
                data: "This message has\ntwo lines.",
            }));

            await until(() => messages.length === 3);
            es.close();
            await until(() => sse!.closed);

            deepStrictEqual(messages, ["Hello", "World", "This message has\ntwo lines."]);
            strictEqual(sse!.lastEventId, "2");
            strictEqual(sse!.closed, true);
            strictEqual(lastEventId, "2");
            strictEqual(es.readyState, EventSource.CLOSED);
        }));

        it("close", jsext.func(async function (defer) {
            if (!isDeno) {
                this.skip();
            }

            const { SSE } = await import("./sse.ts");
            const port = await randomPort();

            let sse: InstanceType<typeof SSE> | undefined = undefined;
            const server = Deno.serve({ port }, req => {
                sse = new SSE(req);
                return sse.response!;
            });
            defer(() => Promise.race([server.shutdown(), sleep(100)]));

            const es = new EventSource(`http://localhost:${port}`);

            await until(() => es.readyState === EventSource.OPEN);
            sse!.close();
            await until(() => es.readyState === EventSource.CONNECTING);

            strictEqual(sse!.closed, true);
            strictEqual(es.readyState, EventSource.CONNECTING);
        }));

        it("listen close event", jsext.func(async function (defer) {
            if (!isDeno) {
                this.skip();
            }

            const { SSE } = await import("./sse.ts");
            const port = await randomPort();

            let sse: InstanceType<typeof SSE> | undefined = undefined;
            let closeEvent: CloseEvent | undefined = undefined;
            const server = Deno.serve({ port }, req => {
                sse = new SSE(req);

                sse.addEventListener("close", _ev => {
                    closeEvent = _ev as CloseEvent;
                });

                return sse.response!;
            });
            defer(() => Promise.race([server.shutdown(), sleep(100)]));

            const es = new EventSource(`http://localhost:${port}`);

            await until(() => es.readyState === EventSource.OPEN);
            es.close();
            await until(() => sse!.closed);
            strictEqual(sse!.closed, true);
            strictEqual(es.readyState, EventSource.CLOSED);
            strictEqual(closeEvent!.type, "close");
            strictEqual(closeEvent!.wasClean, true);
        }));
    });

    describe("SSW (Node.js APIs)", () => {
        if (!isNode) {
            return;
        }

        // TODO
    });

    describe("EventClient", () => {
        it("listen message event", async () => {
            const { SSE, EventClient } = await import("./sse.ts");

            const req = new Request("http://localhost:8080", {
                headers: {
                    "Accept": "text/event-stream",
                },
            });
            const sse = new SSE(req);
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
            const { SSE, EventClient } = await import("./sse.ts");

            const req = new Request("http://localhost:8080", {
                headers: {
                    "Accept": "text/event-stream",
                },
            });
            const sse = new SSE(req);
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
            const { SSE, EventClient } = await import("./sse.ts");

            const req = new Request("http://localhost:8080", {
                headers: {
                    "Accept": "text/event-stream",
                },
            });
            const sse = new SSE(req);
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
            const { SSE, EventClient } = await import("./sse.ts");

            const req = new Request("http://localhost:8080", {
                headers: {
                    "Accept": "text/event-stream",
                },
            });
            const sse = new SSE(req);
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
