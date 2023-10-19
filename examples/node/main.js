import * as http from "node:http";
import { parallel, chan } from "../../esm/index.js";
import { readChannel, wireChannel } from "./util.js";
import { default as handle } from "./handler.js";
const { parallelHandle } = parallel(() => import("./worker.js"));
const { parallelHandle: parallelHandle2 } = parallel(() => import("./worker.js"), {
    adapter: "child_process",
});
const { parallelHandle: parallelHandle3 } = parallel(() => import("./worker.js"), {
    adapter: "child_process",
    serialization: "json",
});


const server = http.createServer(async (_req, _res) => {
    const req = new Request(new URL(_req.url, "http://" + (_req.headers["host"] || "localhost:8000")), {
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

    /** @type {Response} */
    let res;

    if (!process.argv.includes("--cluster")) {
        res = await handle(req);
    } else {
        /**
         * @type {import("../../index.ts").Channel<{ value: Uint8Array | undefined; done: boolean; }>}
         */
        const channel = chan();
        /** @type {(req: import("./worker.js").RequestMessage) => Promise<import("./worker.js").ResponseMessage>} */
        let _handle;

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

        res = new Response(hasBody ? readChannel(channel, true) : null, init);
    }

    _res.writeHead(res.status, res.statusText, Object.fromEntries(res.headers.entries()));
    res.body?.pipeTo(new WritableStream({
        write(chunk) {
            _res.write(chunk);
        },
        close() {
            _res.end();
        }
    }));
});

server.listen(8000, "localhost");
console.log(`Listening on http://localhost:${8000}/`);
