/**
 * Functions for handling HTTP related tasks, such as parsing headers and
 * serving HTTP requests.
 * 
 * Many functions in this module are designed to work in all environments, but
 * some of them are only available in server runtimes such as Node.js, Deno,
 * Bun and Cloudflare Workers.
 * 
 * This module itself is a executable script that can be used to serve static
 * files in the current working directory, or we can provide an entry module
 * which has an default export that satisfies the {@link ServeOptions} to start
 * a custom HTTP server.
 * 
 * The script can be run directly with Deno, Bun, or Node.js.
 * 
 * Deno:
 * ```sh
 * deno run --allow-net --allow-read jsr:@ayonli/jsext/http [--port PORT] [DIR]
 * deno run --allow-net --allow-read jsr:@ayonli/jsext/http <entry.ts>
 * ```
 * 
 * Bun:
 * ```sh
 * bun run node_modules/@ayonli/jsext/http.ts [--port PORT] [DIR]
 * bun run node_modules/@ayonli/jsext/http.ts <entry.ts>
 * ```
 * 
 * Node.js:
 * ```sh
 * node node_modules/@ayonli/jsext/esm/http.js [--port PORT] [DIR]
 * node node_modules/@ayonli/jsext/esm/http.js <entry.js>
 * ```
 * 
 * Node.js (tsx):
 * ```sh
 * tsx node_modules/@ayonli/jsext/http.ts [--port PORT] [DIR]
 * tsx node_modules/@ayonli/jsext/http.ts <entry.ts>
 * ```
 * @module
 * @experimental
 */

import type { IncomingMessage, ServerResponse, Server as HttpServer } from "node:http";
import type { Http2SecureServer, Http2ServerRequest, Http2ServerResponse } from "node:http2";
import { asyncTask } from "./async.ts";
import bytes from "./bytes.ts";
import { args, parseArgs } from "./cli.ts";
import { isBun, isDeno, isNode } from "./env.ts";
import { FileInfo, createReadableStream, exists, readDir, readFile, stat } from "./fs.ts";
import { sha256 } from "./hash.ts";
import {
    BunServer,
    NetAddress,
    RequestContext,
    RequestHandler,
    ServeOptions,
    ServeStaticOptions,
    Server
} from "./http/server.ts";
import { respondDir } from "./http/internal.ts";
import { Range, ifMatch, ifNoneMatch, parseRange } from "./http/util.ts";
import { isMain } from "./module.ts";
import { as } from "./object.ts";
import { extname, join, resolve, startsWith } from "./path.ts";
import { readAsArray } from "./reader.ts";
import { stripStart } from "./string.ts";
import { EventEndpoint } from "./sse.ts";
import { WebSocketServer } from "./ws.ts";

export * from "./http/util.ts";
export type {
    NetAddress,
    RequestContext,
    RequestHandler,
    ServeOptions,
    ServeStaticOptions,
    Server,
};

/**
 * Calculates the ETag for a given entity.
 * 
 * @example
 * ```ts
 * import { stat } from "@ayonli/jsext/fs";
 * import { etag } from "@ayonli/jsext/http";
 * 
 * const etag1 = await etag("Hello, World!");
 * 
 * const data = new Uint8Array([1, 2, 3, 4, 5]);
 * const etag2 = await etag(data);
 * 
 * const info = await stat("file.txt");
 * const etag3 = await etag(info);
 * ```
 */
export async function etag(data: string | Uint8Array | FileInfo): Promise<string> {
    if (typeof data === "string" || data instanceof Uint8Array) {
        if (!data.length) {
            // a short circuit for zero length entities
            return `0-47DEQpj8HBSa+/TImW+5JCeuQeR`;
        }

        if (typeof data === "string") {
            data = bytes(data);
        }

        const hash = await sha256(data, "base64");
        return `${data.length.toString(16)}-${hash.slice(0, 27)}`;
    }

    const mtime = data.mtime ?? new Date();
    const hash = await sha256(mtime.toISOString(), "base64");
    return `${data.size.toString(16)}-${hash.slice(0, 27)}`;
}

/**
 * Returns a random port number that is available for listening.
 * 
 * NOTE: This function is not available in Cloudflare Workers and the browser.
 */
export async function randomPort(prefer: number | undefined = undefined): Promise<number> {
    if (isDeno) {
        try {
            const listener = Deno.listen({ port: prefer ?? 0 });
            const { port } = listener.addr as Deno.NetAddr;
            listener.close();
            return Promise.resolve(port);
        } catch (err) {
            if (prefer) {
                return randomPort(0);
            } else {
                throw err;
            }
        }
    } else if (isBun) {
        try {
            const listener = Bun.listen({
                hostname: "0.0.0.0",
                port: prefer ?? 0,
                socket: {
                    data: () => { },
                },
            }) as { port: number; stop: (force?: boolean) => void; };
            const { port } = listener;
            listener.stop(true);
            return Promise.resolve(port);
        } catch (err) {
            if (prefer) {
                return randomPort(0);
            } else {
                throw err;
            }
        }
    } else if (isNode) {
        const { createServer, connect } = await import("net");

        if (prefer) {
            // In Node.js listening on a port used by another process may work,
            // so we don't use `listen` method to check if the port is available.
            // Instead, we use the `connect` method to check if the port can be
            // reached, if so, the port is open and we don't use it.
            const isOpen = await new Promise<boolean>((resolve, reject) => {
                const conn = connect(prefer);
                conn.once("connect", () => {
                    conn.end();
                    resolve(true);
                }).once("error", (err) => {
                    if ((err as any)["code"] === "ECONNREFUSED") {
                        resolve(false);
                    } else {
                        reject(err);
                    }
                });
            });

            if (isOpen) {
                return randomPort(0);
            } else {
                return prefer;
            }
        } else {
            const server = createServer();
            server.listen({ port: 0, exclusive: true });
            const port = (server.address() as any).port as number;

            return new Promise<number>((resolve, reject) => {
                server.close(err => err ? reject(err) : resolve(port));
            });
        }
    } else {
        throw new Error("Unsupported runtime");
    }
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
 * import { withWeb } from "@ayonli/jsext/http";
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
    }) => void | Response | Promise<void | Response>
): (req: IncomingMessage | Http2ServerRequest, res: ServerResponse | Http2ServerResponse) => void {
    return async (nReq, nRes) => {
        const remoteAddress: NetAddress = {
            family: nReq.socket.remoteFamily as "IPv4" | "IPv6",
            address: nReq.socket.remoteAddress!,
            port: nReq.socket.remotePort!,
        };
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

            toNodeResponse(res, nRes);
        }
    };
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

    const init: RequestInit = {
        method: req.method!,
        headers,
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
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();

        req.on("data", (chunk) => {
            writer.write(chunk);
        }).once("error", (err) => {
            writer.abort(err);
        }).once("end", () => {
            writer.close();
        });

        init.body = readable;
        // @ts-ignore Node.js special
        init.duplex = "half";
    }

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
function toNodeResponse(res: Response, nodeRes: ServerResponse | Http2ServerResponse): void {
    const { status, statusText, headers } = res;

    for (const [key, value] of headers) {
        // Use `setHeader` to set headers instead of passing them to `writeHead`,
        // it seems in Deno, the headers are not written to the response if they
        // are passed to `writeHead`.
        nodeRes.setHeader(key, value);
    }

    if (nodeRes.req.httpVersion === "2.0") {
        nodeRes.writeHead(status);
    } else {
        nodeRes.writeHead(status, statusText);
    }

    if (!res.body) {
        nodeRes.end();
    } else {
        res.body.pipeTo(new WritableStream({
            start(controller) {
                nodeRes.once("close", () => {
                    controller.error();
                }).once("error", (err) => {
                    controller.error(err);
                });
            },
            write(chunk) {
                (nodeRes as ServerResponse).write(chunk);
            },
            close() {
                nodeRes.end();
            },
            abort(err) {
                nodeRes.destroy(err);
            },
        }));
    }
}

/**
 * Serves HTTP requests with the given options.
 * 
 * This function provides a unified way to serve HTTP requests in Node.js, Deno,
 * Bun, Cloudflare Workers and Fastly Compute. It's similar to the `Deno.serve`
 * and `Bun.serve` functions, in fact, it calls them internally when running in
 * the corresponding runtime. When running in Node.js, it uses the built-in
 * `http` or `http2` modules to create the server.
 * 
 * This function also provides easy ways to handle Server-sent Events and
 * WebSockets inside the fetch handler without touching the underlying verbose
 * APIs.
 * 
 * NOTE: In Node.js, this function requires Node.js v18.4.1 or above.
 * 
 * NOTE: WebSocket is not supported in Fastly Compute at the moment.
 * 
 * @example
 * ```ts
 * // simple http server
 * import { serve } from "@ayonli/jsext/http";
 * 
 * serve({
 *     async fetch(req) {
 *         return new Response("Hello, World!");
 *     },
 * });
 * ```
 * 
 * @example
 * ```ts
 * // set the hostname and port
 * import { serve } from "@ayonli/jsext/http";
 * 
 * serve({
 *     hostname: "localhost",
 *     port: 8787, // same port as Wrangler dev
 *     async fetch(req) {
 *         return new Response("Hello, World!");
 *     },
 * });
 * ```
 * 
 * @example
 * ```ts
 * // serve HTTPS/HTTP2 requests
 * import { readFileAsText } from "@ayonli/jsext/fs";
 * import { serve } from "@ayonli/jsext/http";
 * 
 * serve({
 *     key: await readFileAsText("./cert.key"),
 *     cert: await readFileAsText("./cert.pem"),
 *     async fetch(req) {
 *         return new Response("Hello, World!");
 *    },
 * });
 * ```
 * 
 * @example
 * ```ts
 * // respond Server-sent Events
 * import { serve } from "@ayonli/jsext/http";
 * 
 * serve({
 *     async fetch(req, ctx) {
 *         const { events, response } = ctx.createEventEndpoint();
 *         let count = events.lastEventId ? Number(events.lastEventId) : 0;
 * 
 *         setInterval(() => {
 *             const lastEventId = String(++count);
 *             events.dispatchEvent(new MessageEvent("ping", {
 *                 data: lastEventId,
 *                 lastEventId,
 *             }));
 *         }, 5_000);
 * 
 *         return response;
 *     },
 * });
 * ```
 * 
 * @example
 * ```ts
 * // upgrade to WebSocket
 * import { serve } from "@ayonli/jsext/http";
 * 
 * serve({
 *     async fetch(req, ctx) {
 *         const { socket, response } = await ctx.upgradeWebSocket();
 * 
 *         socket.ready.then(() => {
 *             socket.addEventListener("message", (event) => {
 *                console.log(event.data);
 *                socket.send("Hello, Client!");
 *             });
 *         });
 * 
 *         return response;
 *     },
 * });
 * ```
 */
export function serve(options: ServeOptions): Server {
    const type = isDeno ? options.type || "classic" : "classic";
    return new Server(async () => {
        let controller: AbortController | null = null;
        const ws = new WebSocketServer(options.ws);
        const hostname = options.hostname || "0.0.0.0";
        let port = options.port || await randomPort(8000);
        const { key, cert } = options;
        let server: HttpServer | Http2SecureServer | Deno.HttpServer | BunServer | null = null;

        const createContext = (req: Request, remoteAddress: NetAddress): RequestContext => ({
            remoteAddress,
            createEventEndpoint: () => {
                const endpoint = new EventEndpoint(req);
                return { events: endpoint, response: endpoint.response! };
            },
            upgradeWebSocket: () => ws.upgrade(req),
        });

        const handleError = (err: unknown) => {
            console.error(err);
            return new Response("Internal Server Error", {
                status: 500,
                statusText: "Internal Server Error",
            });
        };

        if (isDeno) {
            if (type === "classic") {
                controller = new AbortController();
                const task = asyncTask<void>();
                try {
                    server = Deno.serve({
                        hostname,
                        port,
                        key,
                        cert,
                        signal: controller.signal,
                        onListen: () => task.resolve(),
                        onError: handleError,
                    }, (req, info) => options.fetch(req, createContext(req, {
                        family: info.remoteAddr.hostname.includes(":") ? "IPv6" : "IPv4",
                        address: info.remoteAddr.hostname,
                        port: info.remoteAddr.port,
                    })));
                    await task;
                } catch {
                    server = null;
                }
            } else {
                port = 8000;
            }
        } else if (isBun) {
            const tls = key && cert ? { key, cert } : undefined;
            server = Bun.serve({
                hostname,
                port,
                tls,
                fetch: (req: Request, server: BunServer) => {
                    const remoteAddr = server.requestIP(req)!;
                    return options.fetch(req, createContext(req, remoteAddr));
                },
                websocket: ws?.bunListener,
                error: handleError,
            }) as BunServer;

            ws.bunBind(server);
        } else if (isNode) {
            const reqListener = withWeb(async (req, info) => {
                try {
                    return await options.fetch(req, createContext(req, info.remoteAddress));
                } catch (err) {
                    return handleError(err);
                }
            });

            if (key && cert) {
                const { createSecureServer } = await import("node:http2");
                server = createSecureServer({ key, cert, allowHTTP1: true }, reqListener);
            } else {
                const { createServer } = await import("node:http");
                server = createServer(reqListener);
            }

            await new Promise<void>((resolve) => {
                if (hostname && hostname !== "0.0.0.0") {
                    (server as HttpServer | Http2SecureServer).listen(port, hostname, resolve);
                } else {
                    (server as HttpServer | Http2SecureServer).listen(port, resolve);
                }
            });
        } else {
            throw new Error("Unsupported runtime");
        }

        return { http: server, ws, hostname, port, fetch: options.fetch, controller };
    }, { type });
}

/**
 * Serves static files from a file system directory or KV namespace (in
 * Cloudflare Workers).
 * 
 * NOTE: In Node.js, this function requires Node.js v18.4.1 or above.
 * 
 * NOTE: In Cloudflare Workers, this function requires setting the
 * `[site].bucket` option in the `wrangler.toml` file.
 * 
 * @example
 * ```ts
 * import { serve, serveStatic } from "@ayonli/jsext/http";
 * 
 * export default serve({ // use `serve()` so this program runs in all environments
 *     async fetch(req: Request, ctx) {
 *         const { pathname } = new URL(req.url);
 * 
 *         if (pathname.startsWith("/assets")) {
 *             return await serveStatic(req, {
 *                 fsDir: "./assets",
 *                 kv: ctx.bindings?.__STATIC_CONTENT,
 *                 urlPrefix: "/assets",
 *             });
 *         }
 * 
 *         return new Response("Hello, World!");
 *     }
 * });
 * ```
 * 
 * @example
 * ```toml
 * // wrangler.toml
 * [site]
 * bucket = "./assets"
 * ```
 */
export async function serveStatic(
    req: Request,
    options: ServeStaticOptions = {}
): Promise<Response> {
    const extraHeaders = options.headers ?? {};
    const dir = options.fsDir ?? ".";
    const prefix = options.urlPrefix ? join(options.urlPrefix) : "";
    const url = new URL(req.url);
    const pathname = decodeURIComponent(url.pathname);

    if (prefix && !startsWith(pathname, prefix)) {
        return new Response("Not Found", {
            status: 404,
            statusText: "Not Found",
            headers: extraHeaders,
        });
    }

    const filename = join(dir, stripStart(pathname.slice(prefix.length), "/"));
    let info: FileInfo;

    try {
        info = await stat(filename);
    } catch (err) {
        if (as(err, Error)?.name === "NotFoundError") {
            return new Response(`Not Found`, {
                status: 404,
                statusText: "Not Found",
                headers: extraHeaders,
            });
        } else if (as(err, Error)?.name === "NotAllowedError") {
            return new Response("Forbidden", {
                status: 403,
                statusText: "Forbidden",
                headers: extraHeaders,
            });
        } else {
            return new Response("Internal Server Error", {
                status: 500,
                statusText: "Internal Server Error",
                headers: extraHeaders,
            });
        }
    }

    if (info.kind === "directory") {
        if (!req.url.endsWith("/")) {
            return Response.redirect(req.url + "/", 301);
        } else {
            if (await exists(join(filename, "index.html"))) {
                return serveStatic(new Request(join(req.url, "index.html"), req), options);
            } else if (await exists(join(filename, "index.htm"))) {
                return serveStatic(new Request(join(req.url, "index.htm"), req), options);
            } else if (options.listDir) {
                const entries = await readAsArray(readDir(filename));
                return respondDir(entries, pathname, extraHeaders);
            } else {
                return new Response("Forbidden", {
                    status: 403,
                    statusText: "Forbidden",
                    headers: extraHeaders,
                });
            }
        }
    } else if (info.kind !== "file") {
        return new Response("Forbidden", {
            status: 403,
            statusText: "Forbidden",
            headers: extraHeaders,
        });
    }

    const rangeValue = req.headers.get("Range");
    let range: Range | undefined;

    if (rangeValue && info.size) {
        try {
            range = parseRange(rangeValue);
        } catch {
            return new Response("Invalid Range header", {
                status: 416,
                statusText: "Range Not Satisfiable",
                headers: extraHeaders,
            });
        }
    }

    const mtime = info.mtime ?? new Date();
    const _etag = await etag(info);
    const headers = new Headers({
        ...extraHeaders,
        "Accept-Ranges": "bytes",
        "Last-Modified": mtime.toUTCString(),
        "Etag": _etag,
    });

    const ifModifiedSinceValue = req.headers.get("If-Modified-Since");
    const ifNoneMatchValue = req.headers.get("If-None-Match");
    const ifMatchValue = req.headers.get("If-Match");
    let modified = true;

    if (ifModifiedSinceValue) {
        const date = new Date(ifModifiedSinceValue);
        modified = Math.floor(mtime.valueOf() / 1000) > Math.floor(date.valueOf() / 1000);
    } else if (ifNoneMatchValue) {
        modified = ifNoneMatch(ifNoneMatchValue, _etag);
    }

    if (!modified) {
        return new Response(null, {
            status: 304,
            statusText: "Not Modified",
            headers,
        });
    } else if (ifMatchValue && range && !ifMatch(ifMatchValue, _etag)) {
        return new Response("Precondition Failed", {
            status: 412,
            statusText: "Precondition Failed",
            headers,
        });
    }

    if (/^text\/|^application\/(json|yaml|toml|xml|javascript)$/.test(info.type)) {
        headers.set("Content-Type", info.type + "; charset=utf-8");
    } else {
        headers.set("Content-Type", info.type || "application/octet-stream");
    }

    if (info.atime) {
        headers.set("Date", info.atime.toUTCString());
    }

    if (options.maxAge) {
        headers.set("Cache-Control", `public, max-age=${options.maxAge}`);
    }

    if (range) {
        const { ranges, suffix: suffixLength } = range;
        let start: number;
        let end: number;

        if (ranges.length) {
            ({ start } = ranges[0]!);
            end = Math.min(ranges[0]!.end ?? info.size - 1, info.size - 1);
        } else {
            start = Math.max(info.size - suffixLength!, 0);
            end = info.size - 1;
        }

        const data = await readFile(filename);
        const slice = data.subarray(start, end + 1);

        headers.set("Content-Range", `bytes ${start}-${end}/${info.size}`);
        headers.set("Content-Length", String(end - start + 1));

        return new Response(slice, {
            status: 206,
            statusText: "Partial Content",
            headers,
        });
    } else if (!info.size) {
        headers.set("Content-Length", "0");

        return new Response("", {
            status: 200,
            statusText: "OK",
            headers,
        });
    } else {
        headers.set("Content-Length", String(info.size));

        return new Response(createReadableStream(filename), {
            status: 200,
            statusText: "OK",
            headers,
        });
    }
}

declare const Bun: any;

if (isMain(import.meta)) {
    const options = parseArgs(args, {
        alias: { p: "port" }
    });
    let fetch: ServeOptions["fetch"];
    let hostname = "0.0.0.0";
    let port = Number.isFinite(options["port"]) ? options["port"] as number : undefined;
    let cert: string | undefined;
    let key: string | undefined;
    let filename = String(options[0] || ".");
    const ext = extname(filename);

    if (isDeno || isBun || isNode) {
        (async () => {
            if (/^\.m?(js|ts)x?/.test(ext)) { // custom entry file
                filename = resolve(filename);
                const mod = await import(filename);

                if (typeof mod.default === "object" && typeof mod.default.fetch === "function") {
                    const config = mod.default as ServeOptions;
                    fetch = config.fetch;
                    port ||= config.port;
                    config.hostname && (hostname = config.hostname);
                    config.cert && (cert = config.cert);
                    config.key && (key = config.key);
                } else {
                    throw new Error("Invalid entry file");
                }
            }

            fetch ||= (req) => serveStatic(req, {
                fsDir: filename,
                listDir: true,
                headers: {
                    "Server": typeof navigator === "object" && navigator.userAgent
                        ? navigator.userAgent
                        : typeof process === "object"
                            ? `Node.js/${process.version}`
                            : "Unknown",
                },
            });

            const server = serve({ hostname, port, fetch, key, cert });
            server.ready.then(({ hostname, port }) => {
                hostname = hostname === "0.0.0.0" ? "localhost" : hostname;
                console.log(`Listening on http://${hostname}:${port}/`);
            });
        })();
    }
}
