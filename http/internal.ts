/**
 * This is an internal module that provides utility functions for handling HTTP
 * requests, mostly used by the `http.serve` and `http.serveStatic` functions.
 * 
 * This module is exposed for advanced use cases such as when we want to
 * implement a new `serve` function that behave like the existing one, e.g. for
 * integrating with Vite dev server.
 * @module
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import type { Http2ServerRequest, Http2ServerResponse } from "node:http2";
import { orderBy } from "@jsext/array";
import { join } from "@jsext/path";
import runtime from "@jsext/runtime";
import { EventEndpoint } from "@jsext/sse";
import { capitalize, dedent } from "@jsext/string";
import type { DirEntry } from "@jsext/fs";
import type { WebSocketServer } from "@jsext/ws";
import { constructNetAddress } from "./server.ts";
import type {
    NetAddress,
    FetchEvent,
    RequestContext,
    RequestErrorHandler,
    ServeOptions,
} from "./server.ts";

export interface TimingMetrics {
    timeStart: number;
    timeEnd?: number | undefined;
    description?: string | undefined;
}

export type TimingFunctions = Pick<RequestContext, "time" | "timeEnd"> & {
    /**
     * Returns the timers map associated with the timing functions. If
     * `sanitize` is set, a new map is returned which excludes timers that have
     * not ended yet, and will move the `total` timer to the end of the map if
     * present.
     */
    getTimers: (sanitize?: boolean) => Map<string, TimingMetrics>;
};

function sanitizeTimers(timers: Map<string, TimingMetrics>): Map<string, TimingMetrics> {
    const total = timers.get("total");
    const _timers = new Map([...timers].filter(
        ([name, metrics]) => !!metrics.timeEnd && name !== "total"
    ));

    if (!!total?.timeEnd) {
        _timers.set("total", total);
    }

    return _timers;
}

/**
 * Creates timing functions for measuring the request processing time. This
 * function returns the timing functions and a `timers` map that associates
 * with them.
 */
export function createTimingFunctions(): TimingFunctions & {
    /**
     * @internal Use `getTimers` instead.
     */
    timers: Map<string, TimingMetrics>;
} {
    const timers = new Map<string, TimingMetrics>();

    return {
        timers,
        getTimers: (sanitize = false) => {
            return sanitize ? sanitizeTimers(timers) : timers;
        },
        time: (name: string, description?: string) => {
            if (timers.has(name)) {
                console.warn(`Timer '${name}' already exists`);
            } else {
                timers.set(name, { timeStart: Date.now(), description });
            }
        },
        timeEnd: (name: string) => {
            const metrics = timers.get(name);

            if (metrics) {
                metrics.timeEnd = Date.now();
            } else {
                console.warn(`Timer '${name}' does not exist`);
            }
        },
    };
}

/**
 * Creates a request context object from the given `request` and properties.
 */
export function createRequestContext(
    request: Request,
    props: Pick<RequestContext, "remoteAddress" | "waitUntil" | "bindings" | "time" | "timeEnd"> & {
        ws: WebSocketServer;
    }
): RequestContext {
    const { ws, remoteAddress = null, ...rest } = props;
    const ctx: Partial<RequestContext> = {
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

    return ctx as RequestContext;
};

/**
 * Patches the timing metrics to the response's headers.
 */
export function patchTimingMetrics(
    response: Response,
    timers: Map<string, TimingMetrics>
): Response {
    const metrics = [...sanitizeTimers(timers)].map(([name, metrics]) => {
        const duration = metrics.timeEnd! - metrics.timeStart;
        let value = `${name};dur=${duration}`;

        if (metrics.description) {
            value += `;desc="${metrics.description}"`;
        } else if (name === "total") {
            value += `;desc="Total"`;
        }

        return value;
    }).join(", ");

    if (metrics) {
        try {
            response.headers.set("Server-Timing", metrics);
        } catch {
            // Ignore
        }
    }

    return response;
}

/**
 * Returns a new request handler that wraps the given one so that we can add
 * extra `headers` to the response.
 */
export function withHeaders<A extends any[]>(
    handle: (...args: A) => Response | Promise<Response>,
    headers: HeadersInit | null | undefined = undefined,
): (...args: A) => Promise<Response> {
    if (headers === undefined) {
        const { identity, version } = runtime();
        let serverName = ({
            "node": "Node.js",
            "deno": "Deno",
            "bun": "Bun",
            "workerd": "Cloudflare Workers",
            "fastly": "Fastly Compute",
        })[identity as string] || "Unknown";

        if (version) {
            serverName += `/${version}`;
        }

        headers = { "Server": serverName };
    }

    return async (...args: A) => {
        const response = await handle(...args);

        if (response.status === 101) {
            // WebSocket headers cannot be modified
            return response;
        }

        try {
            const patch = (name: string, value: string) => {
                if (!response.headers.has(name)) {
                    response.headers.set(name, value);
                }
            };

            if (headers instanceof Headers) {
                headers.forEach((value, name) => patch(name, value));
            } else if (Array.isArray(headers)) {
                headers.forEach(([name, value]) => patch(name, value));
            } else if (headers !== null) {
                Object.entries(headers).forEach(([name, value]) => patch(name, value));
            }
        } catch {
            // In case the headers are immutable, ignore the error.
        }

        return response;
    };
}

/**
 * Adds a event listener to the `fetch` event in service workers that handles
 * HTTP requests with the given options.
 */
export function listenFetchEvent(options: Pick<ServeOptions, "fetch" | "headers"> & {
    onError: RequestErrorHandler;
    ws: WebSocketServer;
    bindings?: RequestContext["bindings"];
}): void {
    const { ws, fetch, headers, onError, bindings } = options;

    // @ts-ignore
    addEventListener("fetch", (event: FetchEvent) => {
        const { request } = event;
        const address = request.headers.get("cf-connecting-ip")
            ?? event.client?.address;
        const { getTimers, time, timeEnd } = createTimingFunctions();
        const ctx = createRequestContext(request, {
            ws,
            remoteAddress: address ? constructNetAddress({
                hostname: address,
                port: 0,
            }) : null,
            time,
            timeEnd,
            waitUntil: event.waitUntil?.bind(event),
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
export async function renderDirectoryPage(
    pathname: string,
    entries: DirEntry[],
    extraHeaders: HeadersInit = {}
): Promise<Response> {
    const list = [
        ...orderBy(
            entries.filter(e => e.kind === "directory"),
            e => e.name
        ).map(e => e.name + "/"),
        ...orderBy(
            entries.filter(e => e.kind === "file"),
            e => e.name
        ).map(e => e.name),
    ];

    if (pathname !== "/") {
        list.unshift("../");
    }

    const listHtml = list.map((name) => {
        let url = join(pathname, name);

        if (name.endsWith("/") && url !== "/") {
            url += "/";
        }

        return dedent`
            <li>
                <a href="${url}">${name}</a>
            </li>
            `;
    });

    return new Response(dedent`
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
 * import { withWeb } from "@jsext/http/internal";
 * 
 * const server = http.createServer(withWeb(async (req) => {
 *     return new Response("Hello, World!");
 * }));
 * 
 * server.listen(8000);
 * ```
 */
export function withWeb(
    listener: (req: Request, info: {
        remoteAddress: NetAddress;
    }) => Response | Promise<Response>
): (req: IncomingMessage | Http2ServerRequest, res: ServerResponse | Http2ServerResponse) => void {
    return async (nReq, nRes) => {
        const remoteAddress: NetAddress = constructNetAddress({
            hostname: nReq.socket.remoteAddress!,
            port: nReq.socket.remotePort!,
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

            const gzip = req.headers.get("Accept-Encoding")?.includes("gzip") ?? false;
            await toNodeResponse(res, nRes, gzip);
        }
    };
}

function getByobRequest(controller: ReadableByteStreamController) {
    return "byobRequest" in controller && controller.byobRequest?.view
        ? controller.byobRequest
        : null;
}

/**
 * Transforms a Node.js HTTP request to a modern `Request` object.
 */
function toWebRequest(req: IncomingMessage | Http2ServerRequest): Request {
    const protocol = (req.socket as any)["encrypted"] || req.headers[":scheme"] === "https"
        ? "https" : "http";
    const host = req.headers[":authority"] ?? req.headers["host"];
    const url = new URL(req.url ?? "/", `${protocol}://${host}`);
    const headers = new Headers(Object.fromEntries(Object.entries(req.headers).filter(([key]) => {
        return typeof key === "string" && !key.startsWith(":");
    })) as Record<string, string>);

    if (req.headers[":authority"]) {
        headers.set("Host", req.headers[":authority"] as string);
    }

    const controller = new AbortController();
    const init: RequestInit = {
        method: req.method!,
        headers,
        signal: controller.signal,
    };
    const cache = headers.get("Cache-Control");
    const mode = headers.get("Sec-Fetch-Mode");
    const referrer = headers.get("Referer");

    if (cache === "no-cache") {
        init.cache = "no-cache";
    } else if (cache === "no-store") {
        init.cache = "no-store";
    } else if (cache === "only-if-cached" && mode === "same-origin") {
        init.cache = "only-if-cached";
    } else {
        init.cache = "default";
    }

    if (mode === "no-cors") {
        init.mode = "no-cors";
    } else if (mode === "same-origin") {
        init.mode = "same-origin";
    } else {
        init.mode = "cors";
    }

    if (referrer) {
        init.referrer = referrer;
    }

    if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
        init.body = new ReadableStream({
            type: "bytes",
            start(controller) {
                req.on("data", (chunk: Buffer) => {
                    const data = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
                    const request = getByobRequest(controller);

                    if (request) {
                        const view = request.view as Uint8Array;
                        const viewLength = view.byteLength;

                        if (data.byteLength <= viewLength) {
                            view.set(data);
                            request.respond(data.byteLength);
                        } else {
                            view.set(data.subarray(0, viewLength));
                            request.respond(viewLength);

                            // Enqueue the rest of the data to the stream.
                            controller.enqueue(data.subarray(viewLength));
                        }
                    } else {
                        controller.enqueue(data);
                    }

                    if (typeof controller.desiredSize === "number" && controller.desiredSize <= 0) {
                        req.pause();
                    }
                }).once("error", (err) => {
                    controller.error(err);
                }).once("end", () => {
                    controller.close();
                    getByobRequest(controller)?.respond(0); // Close the BYOB request.
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
            } else {
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
async function toNodeResponse(
    res: Response,
    nodeRes: ServerResponse | Http2ServerResponse,
    gzip = false
): Promise<void> {
    const { status, statusText, headers } = res;
    const length = res.body ? Number(headers.get("Content-Length") ?? 0) : 0;
    const type = headers.get("Content-Type")?.split(";")[0];
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
        !headers.get("Cache-Control")?.includes("no-transform") &&
        (type && isCompressible(type))
    ) {
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
    } else {
        nodeRes.writeHead(status, statusText);
    }

    if (!stream) {
        nodeRes.end();
    } else {
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
                } else {
                    await new Promise<void>(resolve => {
                        const ok = (nodeRes as ServerResponse).write(value);
                        if (ok) {
                            resolve();
                        } else {
                            nodeRes.once("drain", resolve);
                        }
                    });
                }
            } catch (err) {
                if (!nodeRes.destroyed) {
                    nodeRes.destroy(err instanceof Error ? err : new Error(String(err)));
                }
                break;
            }
        }
    }
}

const re = /^text\/|^application\/(.+\+)?(json|yaml|toml|xml|javascript|dart|tar|fontobject|opentype)$|^font\/(otf|ttf)$|^image\/((x-ms-)?bmp|svg\+xml|(vnd\.microsoft\.|x-)icon)|vnd\.adobe\.photoshop/;
function isCompressible(type: string): boolean {
    return type !== "text/event-stream" && re.test(type);
}
