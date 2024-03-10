import { deepStrictEqual, ok } from "node:assert";
import jsext from "./index.ts";

describe("jsext.read", () => {
    it("ReadableStream", async () => {
        const file = await Deno.open("./package.json", { read: true });
        const chunks: Uint8Array[] = [];

        for await (const chunk of jsext.read(file.readable)) {
            chunks.push(chunk as Uint8Array);
        }

        ok(chunks.length > 0);
    });

    it("WebSocket", jsext.func(async function (defer) {
        this.timeout(5000);

        const server = Deno.serve({ port: 12345 }, req => {
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
        defer(() => server.unref());

        const ws = new WebSocket("ws://localhost:12345", "echo-protocol");
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
});

describe("jsext.readAll", () => {
    it("jsext.readAll", async () => {
        const file = await Deno.open("./package.json", { read: true });
        const chunks = await jsext.readAll(file.readable);

        ok(chunks.length > 0);
    });
});
