import * as http from "node:http";
import cluster from "node:cluster";
import { isMainThread } from "node:worker_threads";
import { parallel, chan } from "../../esm/index.js";
import { readChannel, wireChannel } from "./util.js";
import { default as handle } from "./handler.js";
import { availableParallelism } from "node:os";
const { parallelHandle } = parallel(() => import("./worker.js"));

/**
 * @param {http.IncomingMessage} _req
 * @returns {Request}
 */
function incomingMessageToRequest(_req) {
    return new Request(new URL(_req.url, "http://" + (_req.headers["host"] || "localhost:8000")), {
        method: _req.method,
        headers: _req.headers,
        body: ["GET", "HEAD", "OPTIONS"].includes(_req.method) ? null : new ReadableStream({
            async start(controller) {
                for await (const chunk of _req) {
                    controller.enqueue(chunk);
                }

                controller.close();
            },
        }),
        cache: _req.headers["cache-control"],
        credentials: "include",
        keepalive: false,
        mode: _req.headers["sec-fetch-mode"],
        redirect: "follow",
        referrer: _req.headers["referer"],
        duplex: "half",
    });
}

/**
 * @param {Response} res 
 * @param {http.ServerResponse} _res 
 */
function pipeResponse(res, _res) {
    _res.writeHead(res.status, res.statusText, Object.fromEntries(res.headers.entries()));
    res.body?.pipeTo(new WritableStream({
        write(chunk) {
            _res.write(chunk);
        },
        close() {
            _res.end();
        }
    }));
}

if (cluster.isPrimary && isMainThread) {
    if (process.argv.includes("--cluster=builtin")) {
        // Even for a simple web application, this version is the best win. Node.js builtin cluster
        // handles about 3/2 req/sec compared to single-threaded version, and way more ahead than
        // the parallel-threads version, although consumes much more system memory.

        const numCPUs = availableParallelism();

        for (let i = 0; i < numCPUs; i++) {
            cluster.fork();
        }
    } else if (process.argv.includes("--cluster=parallel-threads")) {
        http.createServer(async (_req, _res) => {
            // For a simple web application, using parallel threads isn't an ideal choice,
            // coping and transferring data between the main thread and worker threads is very
            // heavy and slow, the server can only handle about 1/2 req/sec compared to the
            // single-threaded version.
            // Still, it beats Deno's parallel-threads version, it seems Node.js performs better
            // at transferring data between threads.

            const req = incomingMessageToRequest(_req);
            /**
             * @type {import("../../index.ts").Channel<{ value: Uint8Array | undefined; done: boolean; }>}
             */
            const channel = chan();

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
            const res = new Response(hasBody ? readChannel(channel, true) : null, init);

            pipeResponse(res, _res);
        }).listen(8000, "localhost", () => {
            console.log(`Listening on http://localhost:${8000}/`);
        });
    } else {
        // For a simple web application, this single-threaded version performs between the
        // builtin-cluster version and the parallel-threads version.
        http.createServer(async (_req, _res) => {
            const req = incomingMessageToRequest(_req);
            const res = await handle(req);
            pipeResponse(res, _res);
        }).listen(8000, "localhost", () => {
            console.log(`Listening on http://localhost:${8000}/`);
        });
    }
} else { // cluster.isWorker
    http.createServer(async (_req, _res) => {
        const req = incomingMessageToRequest(_req);
        const res = await handle(req);
        pipeResponse(res, _res);
    }).listen(8000, "localhost", () => {
        console.log(`Listening on http://localhost:${8000}/`);
    });
}
