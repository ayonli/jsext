import { parallel, chan } from "../../index.ts";
import { readChannel, wireChannel } from "./util.ts";
import { default as handle } from "./handler.ts";
const { parallelHandle } = parallel(() => import("./worker.ts"));

declare var Deno: any;
declare var WorkerGlobalScope: any;
const isMainThread = typeof WorkerGlobalScope === "undefined";

if (isMainThread) {
    if (Deno.args.includes("--cluster=reverse-proxy")) {
        // This version is very bad, it seems Deno has problem to release resources for GC after
        // dispatched the request to the worker thread, causing enormous memory consumption.
        // And it still handle less req/sec compared to parallel threads.

        const numCPUs = navigator.hardwareConcurrency;
        let counter = 0;

        for (let i = 0; i < numCPUs; i++) {
            const worker = new Worker(import.meta.url, { type: "module" });
            worker.postMessage({ port: 8001 + i });
        }

        Deno.serve({ hostname: "localhost", port: 8000 }, async (req: Request) => {
            const { pathname, search, hash } = new URL(req.url);
            const url = `http://localhost:${8001 + (counter++ % numCPUs)}` + pathname + search + hash;
            return await fetch(url, req);
        });
    } else if (Deno.args.includes("--cluster=parallel-handle")) {
        // For a simple web application, using parallel threads isn't an ideal choice, cloning and
        // transferring data between the main thread and worker threads are very heavy and slow.

        if (Deno.args.includes("--stream-body")) {
            // This version is very slow, because streaming data between threads requires more
            // `postMessage` calls. It can only handle about 1/10 req/sec compared to the
            // single-threaded version.
            // Still, it beats reverse-proxy versions, either the above version or Nginx (very low
            // req/sec, only about 1/8 req/sec compared to parallel threads).

            Deno.serve({ hostname: "localhost", port: 8000 }, async (req: Request) => {
                const channel = chan<{ value: Uint8Array | undefined; done: boolean; }>();

                // Pass the request information and the channel to the threaded function
                // so it can rebuild the request object in the worker thread for use.
                const getResMsg = parallelHandle({
                    url: req.url,
                    method: req.method,
                    headers: Object.fromEntries(req.headers.entries()),
                    streamBody: !!req.body,
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

                const { streamBody, body, ...init } = await getResMsg;

                return new Response(streamBody && channel ? readChannel(channel, true) : (body ?? null), init);
            });
        } else {
            // This version is faster than the streaming version, be cause there are only two
            // `postMessage` calls. However, it consumes more memory because data need to be loaded
            // before they can be transferred. This version handles about 3/8 req/sec compared to
            // the single-threaded version.

            Deno.serve({ hostname: "localhost", port: 8000 }, async (req: Request) => {
                const { body, ...init } = await parallelHandle({
                    url: req.url,
                    method: req.method,
                    headers: Object.fromEntries(req.headers.entries()),
                    streamBody: false,

                    // The body (ArrayBuffer) is transferred rather than cloned.
                    body: req.body ? await req.arrayBuffer() : null,

                    cache: req.cache,
                    credentials: req.credentials,
                    integrity: req.integrity,
                    keepalive: req.keepalive,
                    mode: req.mode,
                    redirect: req.redirect,
                    referrer: req.referrer,
                    referrerPolicy: req.referrerPolicy,
                });

                return new Response(body, init);
            });
        }
    } else {
        // For a simple web application, this single-threaded version is the best win.
        Deno.serve({ hostname: "localhost", port: 8000 }, handle);
    }
} else { // worker thread
    self.onmessage = ({ data: { port } }: MessageEvent<{ port: number; }>) => {
        Deno.serve({ hostname: "localhost", port }, handle);
    };
}
