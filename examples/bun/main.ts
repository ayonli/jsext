import { parallel, chan } from "../../index.ts";
import { readChannel, wireChannel } from "../deno/util.ts";
import { default as handle } from "../deno/handler.ts";
const { parallelHandle } = parallel(() => import("../deno/worker.ts"));

declare var Bun: any;

if (Bun.isMainThread) {
    if (process.argv.includes("--cluster=reverse-proxy")) {
        // This version causes 'segmentation fault`, cannot test.
        const numCPUs = navigator.hardwareConcurrency;
        let counter = 0;

        for (let i = 0; i < numCPUs; i++) {
            const worker = new Worker(import.meta.url, { type: "module" });
            worker.postMessage({ port: 8001 + i });
        }

        Bun.serve({
            hostname: "localhost",
            port: 8000,
            async fetch(req: Request) {
                const { pathname, search, hash } = new URL(req.url);
                const url = `http://localhost:${8001 + (counter++ % numCPUs)}` + pathname + search + hash;
                return await fetch(url, req);
            },
        });
        console.log(`Listening on http://localhost:8000/`);
    } else if (process.argv.includes("--cluster=parallel-handle")) {
        // For a simple web application, using parallel threads isn't an ideal choice, cloning and
        // transferring data between the main thread and worker threads are very heavy and slow.

        if (process.argv.includes("--stream-body")) {
            // This version causes 'libc++abi: Pure virtual function called!`, cannot test.
            Bun.serve({
                hostname: "localhost",
                port: 8000,
                async fetch(req: Request) {
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
                },
            });
        } else {
            // This version handles about 1/5 req/sec compared to the single-threaded version.
            Bun.serve({
                hostname: "localhost",
                port: 8000,
                async fetch(req: Request) {
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
                }
            });
        }

        console.log(`Listening on http://localhost:8000/`);
    } else {
        // This is absolutely the best win. It seems Bun doesn't just run a single-threaded
        // web server (like Node.js and Deno), it spawns multiple threads (= CPUs + 2) to
        // handle connections internally, and they consume very little system memory.
        Bun.serve({
            hostname: "localhost",
            port: 8000,
            fetch: handle,
        });
        console.log(`Listening on http://localhost:8000/`);
    }
} else { // worker thread
    self.onmessage = ({ data: { port } }: MessageEvent<{ port: number; }>) => {
        Bun.serve({
            hostname: "localhost",
            port,
            fetch: handle,
        });
        console.log(`Listening on http://localhost:${port}/`);
    };
}
