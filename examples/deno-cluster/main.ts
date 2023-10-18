import { parallel, chan } from "../../index.ts";
import { readChannel, wireChannel } from "./util.ts";
import { default as handle } from "./handler.ts";
const { parallelHandle } = parallel(() => import("./worker.ts"));

Deno.serve(async req => {
    if (!Deno.args.includes("--cluster")) {
        return await handle(req);
    }

    const channel = chan<{ value: Uint8Array | undefined; done: boolean; }>();

    // Pass the request information and the channel to the threaded function
    // so it can rebuild the request object in the worker thread for use.
    const getResMsg = parallelHandle({
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
});
