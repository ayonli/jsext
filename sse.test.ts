import { deepStrictEqual, strictEqual } from "node:assert";
import { until } from "./async.ts";
import { isBun, isDeno, isNode } from "./env.ts";
import "./index.ts";
import jsext from "./index.ts";

describe("sse", () => {
    if (typeof EventTarget === "undefined" ||
        typeof Request === "undefined" ||
        typeof Response === "undefined"
    ) {
        return;
    }

    it("SSE", async () => {
        const { SSE } = await import("./sse.ts");

        const req1 = new Request("http://localhost:8080", {
            headers: {
                "Accept": "text/event-stream",
            },
        });
        const sse1 = new SSE(req1);
        strictEqual(sse1.lastEventId, "");
        strictEqual(sse1.closed, false);
        strictEqual(sse1.retry, 0);

        await sse1.close();
        strictEqual(sse1.closed, true);

        const req2 = new Request("http://localhost:8080", {
            headers: {
                "Accept": "text/event-stream",
                "Last-Event-ID": "123",
            },
        });
        const sse2 = new SSE(req2, { reconnectionTime: 1000 });
        strictEqual(sse2.lastEventId, "123");
        strictEqual(sse2.closed, false);
        strictEqual(sse2.retry, 1000);

        const { response } = sse2;
        strictEqual(response.status, 200);
        await sse2.close();

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

    it("SSE#send & SSE#sendEvent & SSE.dispatchEvent", jsext.func(async function (defer) {
        if (!isDeno) {
            this.skip();
        }

        const { SSE } = await import("./sse.ts");

        let sse: InstanceType<typeof SSE> | undefined = undefined;
        const server = Deno.serve({ port: 8081 }, req => {
            sse = new SSE(req);
            return sse.response;
        });
        defer(() => server.shutdown());

        const es = new EventSource("http://localhost:8081");
        const messages: string[] = [];
        const myEventMessages: string[] = [];
        let lastEventId = "";

        await until(() => sse);

        es.addEventListener("message", (ev) => {
            const data = ev.data;
            messages.push(data);
            lastEventId = ev.lastEventId;
        });

        es.addEventListener("my-event", (ev) => {
            const data = ev.data;
            myEventMessages.push(data);
            lastEventId = ev.lastEventId;
        });

        await sse!.send("Hello", "1");
        // await sse!.send("World", "2");
        sse!.dispatchEvent(new MessageEvent("message", {
            data: "World",
            lastEventId: "2",
        }));
        await sse!.sendEvent("my-event", "Hi", "3");
        // await sse!.sendEvent("my-event", "A-yon", "4");
        sse!.dispatchEvent(new MessageEvent("my-event", {
            data: "A-yon",
            lastEventId: "4",
        }));

        await until(() => messages.length === 2 && myEventMessages.length === 2);
        es.close();
        await until(() => sse!.closed);

        deepStrictEqual(messages, ["Hello", "World"]);
        deepStrictEqual(myEventMessages, ["Hi", "A-yon"]);
        strictEqual(sse!.lastEventId, "4");
        strictEqual(sse!.closed, true);
        strictEqual(lastEventId, "4");
        strictEqual(es.readyState, EventSource.CLOSED);
    }));

    it("EventsReader", async () => {
        const { SSE, EventsReader } = await import("./sse.ts");

        const req = new Request("http://localhost:8080", {
            headers: {
                "Accept": "text/event-stream",
            },
        });
        const sse = new SSE(req);
        strictEqual(sse.closed, false);
        const { response } = sse;

        const reader = new EventsReader(response);
        const messages: string[] = [];
        const myEventMessages: string[] = [];

        reader.addEventListener("message", (ev) => {
            const data = ev.data;
            messages.push(data);
        });

        reader.addEventListener("my-event", (ev) => {
            const data = ev.data;
            myEventMessages.push(data);
        });

        await sse.send("Hello", "1");
        await sse.send("World", "2");
        await sse.sendEvent("my-event", "Hi", "3");
        await sse.sendEvent("my-event", "A-yon", "4");

        await until(() => messages.length === 2 && myEventMessages.length === 2);
        await reader.close();

        deepStrictEqual(messages, ["Hello", "World"]);
        deepStrictEqual(myEventMessages, ["Hi", "A-yon"]);
        strictEqual(sse.lastEventId, "4");
        strictEqual(reader.lastEventId, "4");
        strictEqual(sse.closed, true);
        strictEqual(reader.closed, true);
    });

    it("SSE#close", jsext.func(async function (defer) {
        if (!isDeno) {
            this.skip();
        }

        const { SSE, EventsReader } = await import("./sse.ts");

        let sse: InstanceType<typeof SSE> | undefined = undefined;
        const server = Deno.serve({ port: 8082 }, req => {
            sse = new SSE(req);
            return sse.response;
        });
        defer(() => server.shutdown());

        const es = new EventSource("http://localhost:8082");

        await until(() => es.readyState === EventSource.OPEN);
        await sse!.close();
        await until(() => es.readyState === EventSource.CONNECTING);

        strictEqual(sse!.closed, true);
        strictEqual(es.readyState, EventSource.CONNECTING);

        const res = await fetch("http://localhost:8082");
        const reader = new EventsReader(res);

        strictEqual(sse!.closed, false);
        await sse!.close();
        await until(() => reader.closed);

        strictEqual(sse!.closed, true);
        strictEqual(reader.closed, true);
    }));

    it("listen close event", jsext.func(async function (defer) {
        const { SSE, EventsReader } = await import("./sse.ts");

        if (isNode || isBun) {
            const req = new Request("http://localhost:8080", {
                headers: {
                    "Accept": "text/event-stream",
                },
            });
            const sse = new SSE(req);
            strictEqual(sse.closed, false);
            const { response } = sse;

            let ev: CloseEvent | undefined = undefined;
            sse.addEventListener("close", _ev => {
                ev = _ev as CloseEvent;
            });

            const reader = new EventsReader(response);
            await reader.close();
            await until(() => sse!.closed);
            strictEqual(sse!.closed, true);
            strictEqual(ev!.type, "close");
        } else if (isDeno) {
            let sse: InstanceType<typeof SSE> | undefined = undefined;
            let ev: CloseEvent | undefined = undefined;
            const server = Deno.serve({ port: 8082 }, req => {
                sse = new SSE(req);

                ev = undefined;
                sse.addEventListener("close", _ev => {
                    ev = _ev as CloseEvent;
                });

                return sse.response;
            });
            defer(() => server.shutdown());

            const es = new EventSource("http://localhost:8082");

            await until(() => es.readyState === EventSource.OPEN);
            es.close();
            await until(() => sse!.closed);
            strictEqual(sse!.closed, true);
            strictEqual(es.readyState, EventSource.CLOSED);
            strictEqual(ev!.type, "close");

            const res = await fetch("http://localhost:8082");
            const reader = new EventsReader(res);
            strictEqual(sse!.closed, false);

            await reader.close();
            await until(() => sse!.closed);
            strictEqual(sse!.closed, true);
            strictEqual(ev!.type, "close");
        }
    }));
});
