import { parallel, chan } from "https://ayonli.github.io/jsext/index.ts";
import { readChannel, wireChannel } from "./util.ts";
const { handleRequest } = parallel(() => import("./worker.ts"));

Deno.serve(async req => {
    const channel = chan<{ value: Uint8Array | undefined; done: boolean; }>();
    const getResMsg = handleRequest({
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
    }, channel);

    req.body && wireChannel(req.body, channel);

    const { hasBody, ...init } = await getResMsg;

    return new Response(hasBody ? readChannel(channel) : null, init);
});
