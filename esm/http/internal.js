import { orderBy } from '../array.js';
import { join } from '../path.js';
import runtime from '../runtime.js';
import { EventEndpoint } from '../sse.js';
import { dedent, capitalize } from '../string.js';
import { constructNetAddress } from './server.js';

/**
 * This is an internal module that provides utility functions for handling HTTP
 * requests, mostly used by the `http.serve` and `http.serveStatic` functions.
 *
 * This module is exposed for advanced use cases such as when we want to
 * implement a new `serve` function that behave like the existing one, e.g. for
 * integrating with Vite dev server.
 * @module
 */
function sanitizeTimers(timers) {
    const total = timers.get("total");
    const _timers = new Map([...timers].filter(([name, metrics]) => !!metrics.timeEnd && name !== "total"));
    if (!!(total === null || total === void 0 ? void 0 : total.timeEnd)) {
        _timers.set("total", total);
    }
    return _timers;
}
/**
 * Creates timing functions for measuring the request processing time. This
 * function returns the timing functions and a `timers` map that associates
 * with them.
 */
function createTimingFunctions() {
    const timers = new Map();
    return {
        timers,
        getTimers: (sanitize = false) => {
            return sanitize ? sanitizeTimers(timers) : timers;
        },
        time: (name, description) => {
            if (timers.has(name)) {
                console.warn(`Timer '${name}' already exists`);
            }
            else {
                timers.set(name, { timeStart: Date.now(), description });
            }
        },
        timeEnd: (name) => {
            const metrics = timers.get(name);
            if (metrics) {
                metrics.timeEnd = Date.now();
            }
            else {
                console.warn(`Timer '${name}' does not exist`);
            }
        },
    };
}
/**
 * Creates a request context object from the given `request` and properties.
 */
function createRequestContext(request, props) {
    const { ws, remoteAddress = null, ...rest } = props;
    const ctx = {
        remoteAddress,
        upgradeEventEndpoint: () => {
            const endpoint = new EventEndpoint(request);
            return { endpoint, response: endpoint.response };
        },
        upgradeWebSocket: () => ws.upgrade(request),
        ...rest,
    };
    Object.defineProperty(ctx, "createEventEndpoint", {
        enumerable: true, // MUST be enumerable in order to work with Hono
        value: () => {
            const events = new EventEndpoint(request);
            return { events, response: events.response };
        },
    });
    return ctx;
}
/**
 * Patches the timing metrics to the response's headers.
 */
function patchTimingMetrics(response, timers) {
    const metrics = [...sanitizeTimers(timers)].map(([name, metrics]) => {
        const duration = metrics.timeEnd - metrics.timeStart;
        let value = `${name};dur=${duration}`;
        if (metrics.description) {
            value += `;desc="${metrics.description}"`;
        }
        else if (name === "total") {
            value += `;desc="Total"`;
        }
        return value;
    }).join(", ");
    if (metrics) {
        try {
            response.headers.set("Server-Timing", metrics);
        }
        catch (_a) {
            // Ignore
        }
    }
    return response;
}
/**
 * Returns a new request handler that wraps the given one so that we can add
 * extra `headers` to the response.
 */
function withHeaders(handle, headers = undefined) {
    if (headers === undefined) {
        const { identity, version } = runtime();
        let serverName = ({
            "node": "Node.js",
            "deno": "Deno",
            "bun": "Bun",
            "workerd": "Cloudflare Workers",
            "fastly": "Fastly Compute",
        })[identity] || "Unknown";
        if (version) {
            serverName += `/${version}`;
        }
        headers = { "Server": serverName };
    }
    return async (...args) => {
        const response = await handle(...args);
        if (response.status === 101) {
            // WebSocket headers cannot be modified
            return response;
        }
        try {
            const patch = (name, value) => {
                if (!response.headers.has(name)) {
                    response.headers.set(name, value);
                }
            };
            if (headers instanceof Headers) {
                headers.forEach((value, name) => patch(name, value));
            }
            else if (Array.isArray(headers)) {
                headers.forEach(([name, value]) => patch(name, value));
            }
            else if (headers !== null) {
                Object.entries(headers).forEach(([name, value]) => patch(name, value));
            }
        }
        catch (_a) {
            // In case the headers are immutable, ignore the error.
        }
        return response;
    };
}
/**
 * Adds a event listener to the `fetch` event in service workers that handles
 * HTTP requests with the given options.
 */
function listenFetchEvent(options) {
    const { ws, fetch, headers, onError, bindings } = options;
    // @ts-ignore
    addEventListener("fetch", (event) => {
        var _a, _b, _c;
        const { request } = event;
        const address = (_a = request.headers.get("cf-connecting-ip")) !== null && _a !== void 0 ? _a : (_b = event.client) === null || _b === void 0 ? void 0 : _b.address;
        const { getTimers, time, timeEnd } = createTimingFunctions();
        const ctx = createRequestContext(request, {
            ws,
            remoteAddress: address ? constructNetAddress({
                hostname: address,
                port: 0,
            }) : null,
            time,
            timeEnd,
            waitUntil: (_c = event.waitUntil) === null || _c === void 0 ? void 0 : _c.bind(event),
            bindings,
        });
        const _handle = withHeaders(fetch, headers);
        const _onError = withHeaders(onError, headers);
        const response = _handle(request, ctx)
            .then(res => patchTimingMetrics(res, getTimers()))
            .catch(err => _onError(err, request, ctx));
        event.respondWith(response);
    });
}
/**
 * Renders a directory listing page for the `pathname` with the given `entries`.
 */
async function renderDirectoryPage(pathname, entries, extraHeaders = {}) {
    const list = [
        ...orderBy(entries.filter(e => e.kind === "directory"), e => e.name).map(e => e.name + "/"),
        ...orderBy(entries.filter(e => e.kind === "file"), e => e.name).map(e => e.name),
    ];
    if (pathname !== "/") {
        list.unshift("../");
    }
    const listHtml = list.map((name) => {
        let url = join(pathname, name);
        if (name.endsWith("/") && url !== "/") {
            url += "/";
        }
        return dedent `
            <li>
                <a href="${url}">${name}</a>
            </li>
            `;
    });
    return new Response(dedent `
                <!DOCTYPE HTML>
                <html lang="en">
                <head>
                    <meta charset="utf-8">
                    <title>Directory listing for ${pathname}</title>
                    <style>
                    body {
                        font-family: system-ui;
                    }
                    </style>
                </head>
                <body>
                    <h1>Directory listing for ${pathname}</h1>
                    <hr>
                    <ul>
                        ${listHtml.join("")}
                    </ul>
                </body>
                </html>
                `, {
        status: 200,
        statusText: "OK",
        headers: {
            ...extraHeaders,
            "Content-Type": "text/html; charset=utf-8",
        },
    });
}
/**
 * Creates a Node.js HTTP request listener with modern Web APIs.
 *
 * NOTE: This function is only available in Node.js and requires Node.js v18.4.1
 * or above.
 *
 * @example
 * ```ts
 * import * as http from "node:http";
 * import { withWeb } from "@ayonli/jsext/http/internal";
 *
 * const server = http.createServer(withWeb(async (req) => {
 *     return new Response("Hello, World!");
 * }));
 *
 * server.listen(8000);
 * ```
 */
function withWeb(listener) {
    return async (nReq, nRes) => {
        var _a, _b;
        const remoteAddress = constructNetAddress({
            hostname: nReq.socket.remoteAddress,
            port: nReq.socket.remotePort,
        });
        const req = toWebRequest(nReq);
        const res = await listener(req, { remoteAddress });
        if (!nRes.req) { // fix for Deno and Node.js below v15.7.0
            Object.assign(nRes, { req: nReq });
        }
        if (res && !nRes.headersSent) {
            if (res.status === 101) {
                // When the status code is 101, it means the server is upgrading
                // the connection to a different protocol, usually to WebSocket.
                // In this case, the response shall be and may have already been
                // written by the request socket. So we should not write the
                // response again.
                return;
            }
            const gzip = (_b = (_a = req.headers.get("Accept-Encoding")) === null || _a === void 0 ? void 0 : _a.includes("gzip")) !== null && _b !== void 0 ? _b : false;
            await toNodeResponse(res, nRes, gzip);
        }
    };
}
function getByobRequest(controller) {
    var _a;
    return "byobRequest" in controller && ((_a = controller.byobRequest) === null || _a === void 0 ? void 0 : _a.view)
        ? controller.byobRequest
        : null;
}
/**
 * Transforms a Node.js HTTP request to a modern `Request` object.
 */
function toWebRequest(req) {
    var _a, _b;
    const protocol = req.socket["encrypted"] || req.headers[":scheme"] === "https"
        ? "https" : "http";
    const host = (_a = req.headers[":authority"]) !== null && _a !== void 0 ? _a : req.headers["host"];
    const url = new URL((_b = req.url) !== null && _b !== void 0 ? _b : "/", `${protocol}://${host}`);
    const headers = new Headers(Object.fromEntries(Object.entries(req.headers).filter(([key]) => {
        return typeof key === "string" && !key.startsWith(":");
    })));
    if (req.headers[":authority"]) {
        headers.set("Host", req.headers[":authority"]);
    }
    const controller = new AbortController();
    const init = {
        method: req.method,
        headers,
        signal: controller.signal,
    };
    const cache = headers.get("Cache-Control");
    const mode = headers.get("Sec-Fetch-Mode");
    const referrer = headers.get("Referer");
    if (cache === "no-cache") {
        init.cache = "no-cache";
    }
    else if (cache === "no-store") {
        init.cache = "no-store";
    }
    else if (cache === "only-if-cached" && mode === "same-origin") {
        init.cache = "only-if-cached";
    }
    else {
        init.cache = "default";
    }
    if (mode === "no-cors") {
        init.mode = "no-cors";
    }
    else if (mode === "same-origin") {
        init.mode = "same-origin";
    }
    else {
        init.mode = "cors";
    }
    if (referrer) {
        init.referrer = referrer;
    }
    if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
        init.body = new ReadableStream({
            type: "bytes",
            start(controller) {
                req.on("data", (chunk) => {
                    const data = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
                    const request = getByobRequest(controller);
                    if (request) {
                        const view = request.view;
                        const viewLength = view.byteLength;
                        if (data.byteLength <= viewLength) {
                            view.set(data);
                            request.respond(data.byteLength);
                        }
                        else {
                            view.set(data.subarray(0, viewLength));
                            request.respond(viewLength);
                            // Enqueue the rest of the data to the stream.
                            controller.enqueue(data.subarray(viewLength));
                        }
                    }
                    else {
                        controller.enqueue(data);
                    }
                    if (typeof controller.desiredSize === "number" && controller.desiredSize <= 0) {
                        req.pause();
                    }
                }).once("error", (err) => {
                    controller.error(err);
                }).once("end", () => {
                    var _a;
                    controller.close();
                    (_a = getByobRequest(controller)) === null || _a === void 0 ? void 0 : _a.respond(0); // Close the BYOB request.
                });
            },
            pull() {
                req.resume();
            },
        }, {
            highWaterMark: req.readableHighWaterMark,
        });
        // @ts-ignore Node.js special
        init.duplex = "half";
    }
    req.once("close", () => {
        if (req.errored) {
            if (req.errored.message.includes("aborted")) {
                controller.abort(new DOMException("The request has been cancelled.", "AbortError"));
            }
            else {
                controller.abort(req.errored);
            }
        }
    });
    const request = new Request(url, init);
    if (!req.headers[":authority"]) {
        Object.assign(request, {
            [Symbol.for("incomingMessage")]: req,
        });
    }
    return request;
}
/**
 * Pipes a modern `Response` object to a Node.js HTTP response.
 */
async function toNodeResponse(res, nodeRes, gzip = false) {
    var _a, _b, _c;
    const { status, statusText, headers } = res;
    const length = res.body ? Number((_a = headers.get("Content-Length")) !== null && _a !== void 0 ? _a : 0) : 0;
    const type = (_b = headers.get("Content-Type")) === null || _b === void 0 ? void 0 : _b.split(";")[0];
    let stream = res.body;
    for (const [key, value] of headers) {
        // Use `setHeader` to set headers instead of passing them to `writeHead`,
        // it seems in Deno, the headers are not written to the response if they
        // are passed to `writeHead`.
        nodeRes.setHeader(capitalize(key, true), value);
    }
    // Compress the response body with Gzip if the client supports it and the
    // requirements are met.
    // See https://docs.deno.com/deploy/api/compression/
    if (stream && gzip && typeof CompressionStream === "function" &&
        (length > 20 || !headers.has("Content-Length")) &&
        !headers.has("Content-Encoding") &&
        !headers.has("Content-Range") &&
        !((_c = headers.get("Cache-Control")) === null || _c === void 0 ? void 0 : _c.includes("no-transform")) &&
        (type && isCompressible(type))) {
        stream = stream.pipeThrough(new CompressionStream("gzip"));
        nodeRes.removeHeader("Content-Length");
        nodeRes.setHeader("Content-Encoding", "gzip");
        nodeRes.setHeader("Vary", "Accept-Encoding");
        const etag = headers.get("ETag");
        if (etag && !etag.startsWith("W/")) {
            nodeRes.setHeader("ETag", `W/${etag}`);
        }
    }
    if (nodeRes.req.httpVersion === "2.0") {
        nodeRes.writeHead(status);
    }
    else {
        nodeRes.writeHead(status, statusText);
    }
    if (!stream) {
        nodeRes.end();
    }
    else {
        const reader = stream.getReader();
        nodeRes.once("close", () => {
            nodeRes.errored ? reader.cancel(nodeRes.errored) : reader.cancel();
        });
        while (true) {
            try {
                const { done, value } = await reader.read();
                if (done) {
                    value ? nodeRes.end(value) : nodeRes.end();
                    break;
                }
                else {
                    await new Promise(resolve => {
                        const ok = nodeRes.write(value);
                        if (ok) {
                            resolve();
                        }
                        else {
                            nodeRes.once("drain", resolve);
                        }
                    });
                }
            }
            catch (err) {
                if (!nodeRes.destroyed) {
                    nodeRes.destroy(err instanceof Error ? err : new Error(String(err)));
                }
                break;
            }
        }
    }
}
const re = /^text\/|^application\/(.+\+)?(json|yaml|toml|xml|javascript|dart|tar|fontobject|opentype)$|^font\/(otf|ttf)$|^image\/((x-ms-)?bmp|svg\+xml|(vnd\.microsoft\.|x-)icon)|vnd\.adobe\.photoshop/;
function isCompressible(type) {
    return type !== "text/event-stream" && re.test(type);
}

export { createRequestContext, createTimingFunctions, listenFetchEvent, patchTimingMetrics, renderDirectoryPage, withHeaders, withWeb };
//# sourceMappingURL=internal.js.map
