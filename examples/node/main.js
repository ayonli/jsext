import * as http from "node:http";
import cluster from "node:cluster";
import { isMainThread, Worker, workerData } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { parallel, chan } from "../../esm/index.js";
import { withWeb } from "../../esm/http.js";
import { readChannel, wireChannel } from "./util.js";
import { default as handle } from "./handler.js";
import { availableParallelism } from "node:os";
const { parallelHandle } = parallel(() => import("./worker.js"));

if (cluster.isPrimary && isMainThread) {
    if (process.argv.includes("--cluster=builtin-cluster")) {
        // The builtin `cluster` module handles about 2 times req/sec compared to single-threaded
        // version, and way more ahead than the parallel-handle version, although consumes much
        // more system memory.

        const numCPUs = availableParallelism();

        for (let i = 0; i < numCPUs; i++) {
            cluster.fork();
        }
    } else if (process.argv.includes("--cluster=native-worker")) {
        // This version is the best, it performs the same as `cluster` module, and consume much less
        // system memory (same as parallel-handle).

        const server = http.createServer(withWeb(async (req) => {
            return await handle(req);
        }));

        server.listen(8000, () => {
            console.log(`Listening on http://localhost:${8000}/`);
            const maxWorkers = availableParallelism() - 1;

            for (let i = 0; i < maxWorkers; i++) {
                new Worker(fileURLToPath(import.meta.url), {
                    workerData: { handle: { fd: server._handle.fd } }
                });
            }
        });
    } else if (process.argv.includes("--cluster=parallel-handle")) {
        // For a simple web application, using parallel threads isn't an ideal choice, cloning and
        // transferring data between the main thread and worker threads are very heavy and slow.
        //
        // In Node.js, sending streaming body or transferring it performs roughly the same.
        // both versions can only handle about 1/2 req/sec compared to the single-threaded version.

        if (process.argv.includes("--stream-body")) {
            http.createServer(withWeb(async (req) => {
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

                const { streamBody, ...init } = await getResMsg;

                return new Response(streamBody ? readChannel(channel, true) : null, init);
            })).listen(8000, "localhost", () => {
                console.log(`Listening on http://localhost:${8000}/`);
            });
        } else {
            http.createServer(withWeb(async (req) => {
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
            })).listen(8000, "localhost", () => {
                console.log(`Listening on http://localhost:${8000}/`);
            });
        }
    } else {
        // For a simple web application, this single-threaded version performs between the
        // builtin-cluster version and the parallel-handle version.
        http.createServer(withWeb(async (req) => {
            return await handle(req);
        })).listen(8000, "localhost", () => {
            console.log(`Listening on http://localhost:${8000}/`);
        });
    }
} else if (cluster.isPrimary && !isMainThread) {
    http.createServer(withWeb(async (req) => {
        return await handle(req);
    })).listen(workerData.handle, () => {
        console.log(`Listening on http://localhost:${8000}/`);
    });
} else { // cluster.isWorker
    http.createServer(withWeb(async (req) => {
        return await handle(req);
    })).listen(8000, "localhost", () => {
        console.log(`Listening on http://localhost:${8000}/`);
    });
}
