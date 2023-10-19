import { parallel, chan } from "../../index.ts";
import { readChannel, wireChannel } from "../deno/util.ts";
import { default as handle } from "../deno/handler.ts";
const { parallelHandle } = parallel(() => import("../deno/worker.ts"));
const { parallelHandle: parallelHandle2 } = parallel(() => import("../deno/worker.ts"), {
    adapter: "child_process",
});
const { parallelHandle: parallelHandle3 } = parallel(() => import("../deno/worker.ts"), {
    adapter: "child_process",
    serialization: "json", // should have no effect since Bun doesn't support this
});

Bun.serve({
    port: 8000,
    hostname: "localhost",
    async fetch(req: Request) {
        if (!process.argv.includes("--cluster")) {
            return await handle(req);
        }

        const channel = chan<{ value: Uint8Array | undefined; done: boolean; }>();
        let _handle: typeof parallelHandle;

        if (process.argv.includes("--child-process")) {
            _handle = process.argv.includes("--json")
                ? parallelHandle3
                : parallelHandle2;
        } else {
            _handle = parallelHandle;
        }

        // Pass the request information and the channel to the threaded function
        // so it can rebuild the request object in the worker thread for use.
        const getResMsg = _handle({
            url: req.url,
            method: req.method,
            headers: Object.fromEntries(req.headers.entries()),
            hasBody: !!req.body,
            cache: req.cache,
            credentials: req.credentials,
            integrity: req.integrity,
            keepalive: req.keepalive,
            mode: req.mode,
            redirect: req.redirect,
            referrer: req.referrer,
            referrerPolicy: req.referrerPolicy,
        }, channel); // pass channel as argument to the threaded function

        req.body && wireChannel(req.body, channel);

        const { hasBody, ...init } = await getResMsg;

        return new Response(hasBody ? readChannel(channel, true) : null, init);
    }
});
console.log(`Listening on http://localhost:${8000}/`);
