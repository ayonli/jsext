/// <reference path="../lib.deno.d.ts" />
import { SSE } from "../sse.ts";

Deno.serve({ port: 8082 }, req => {
    const sse = new SSE(req);

    setTimeout(async () => {
        await sse.send("Hello, World!", "1");
        await sse.sendEvent("my-event", "Hi, World!", "2");
        sse.dispatchEvent(new MessageEvent("another-event", {
            data: "Hi, A-yon!",
            lastEventId: "3",
        }));
    }, 100);

    return sse.response;
});

self.postMessage("ready");
