import type { Server as HttpServer } from "node:http";
import type { Http2SecureServer } from "node:http2";
import type { serve, serveStatic } from "../http.ts";
import type { EventEndpoint } from "../sse.ts";
import type { WebSocketConnection, WebSocketHandler, WebSocketServer } from "../ws.ts";
import runtime from "../runtime.ts";
import { until } from "../async.ts";

export interface BunServer {
    fetch(request: Request | string): Response | Promise<Response>;
    ref(): void;
    requestIP(request: Request): { family: "IPv4" | "IPv6"; address: string; port: number; } | null;
    stop(closeActiveConnections?: boolean): void;
    unref(): void;
    upgrade<T = undefined>(
        request: Request,
        options?: {
            data?: T;
            headers?: HeadersInit;
        },
    ): boolean;

    readonly development: boolean;
    readonly hostname: string;
    readonly id: string;
    readonly pendingRequests: number;
    readonly pendingWebSockets: number;
    readonly port: number;
    readonly url: URL;
}

export interface KVNamespace {
    get(key: string, options?: { type?: "text"; }): Promise<string | null>;
    get(key: string, options: { type: "json"; }): Promise<any | null>;
    get(key: string, options: { type: "arrayBuffer"; }): Promise<ArrayBuffer | null>;
    get(key: string, options: { type?: "stream"; }): Promise<ReadableStream | null>;
    put(key: string, value: string | ArrayBuffer | ReadableStream): Promise<void>;
    delete(key: string): Promise<void>;
    list(options?: {
        prefix?: string;
        limit?: number;
        cursor?: string;
    }): Promise<{
        keys: { name: string; expiration?: number; }[];
        list_complete: boolean;
        cursor: string | null;
    }>;
}

/**
 * Represents the network address of a connection peer.
 */
export interface NetAddress {
    family: "IPv4" | "IPv6";
    address: string;
    port: number;
}

/**
 * Represents the context of an HTTP request. It provides additional information
 * about the request and allows for upgrading the connection to a WebSocket.
 */
export interface RequestContext {
    /**
     * The remote address of the client. This options is not available in
     * Cloudflare Workers or when the server is started with `deno serve`.
     */
    remoteAddress: NetAddress | null;
    /**
     * Creates an SSE (server-sent events) endpoint for sending events to the
     * client.
     */
    createEventEndpoint(): { events: EventEndpoint; response: Response; };
    /**
     * Upgrades the request to a WebSocket connection.
     */
    upgradeWebSocket(): Promise<{ socket: WebSocketConnection; response: Response; }>;
    /**
     * Prolongs the request's lifetime until the promise is resolved. Only
     * available in Cloudflare Workers.
     */
    waitUntil?(promise: Promise<unknown>): void;
    /**
     * The bindings of the request. Only available in Cloudflare Workers.
     */
    bindings?: Record<string, any>;
}

/**
 * The handler for processing HTTP requests.
 */
export type RequestHandler = (request: Request, ctx: RequestContext) => Response | Promise<Response>;

/**
 * Options for serving HTTP requests, used by {@link serve}.
 */
export interface ServeOptions {
    /**
     * The handler for processing HTTP requests.
     */
    fetch: RequestHandler;
    /**
     * The hostname to listen on. Default is `0.0.0.0`.
     */
    hostname?: string | undefined;
    /**
     * The port to listen on. If not set, the server will first try to use the
     * `8000` port, and if it's not available, it will use a random port.
     */
    port?: number | undefined;
    /**
     * The certificate key for serving HTTPS/HTTP2 requests.
     */
    key?: string | undefined;
    /**
     * The certificate for serving HTTPS/HTTP2 requests.
     */
    cert?: string | undefined;
    /**
     * The WebSocket handler for processing WebSocket connections.
     */
    ws?: WebSocketHandler | undefined;
}


/**
 * Options for serving static files, used by {@link serveStatic}.
 */
export interface ServeStaticOptions {
    /**
     * The file system directory to serve files from. If not set, the current
     * working directory will be used. This option is not available in
     * Cloudflare Workers, set `kv` instead.
     */
    fsDir?: string;
    /**
     * A KV namespace in Cloudflare Workers where the static files are stored.
     * This option is only needed in Cloudflare Workers, usually obtained via
     * `env.__STATIC_CONTENT`.
     */
    kv?: KVNamespace;
    /**
     * The prefix that will be stripped from the URL pathname.
     */
    urlPrefix?: string;
    /**
     * Whether to list the directory entries when the URL pathname is a
     * directory. If not set, a 403 Forbidden response will be returned.
     */
    listDir?: boolean;
    /**
     * The maximum age in seconds for the "Cache-Control" header.
     */
    maxAge?: number;
    /**
     * Extra headers to be set in the response.
     */
    headers?: HeadersInit;
}

const _hostname = Symbol.for("hostname");
const _port = Symbol.for("port");
const _http = Symbol.for("http");
const _ws = Symbol.for("ws");
const _handler = Symbol.for("handler");
const _controller = Symbol.for("controller");

/**
 * A unified HTTP server interface.
 */
export class Server {
    private [_hostname] = "";
    private [_port] = 0;
    private [_http]: Promise<HttpServer | Http2SecureServer | Deno.HttpServer | BunServer | null>;
    private [_ws]: WebSocketServer | null = null;
    private [_handler]: RequestHandler | null = null;
    private [_controller]: AbortController | null = null;

    /**
     * A request handler for using the server instance as an ES module worker in
     * Cloudflare Workers.
     */
    readonly fetch: ((req: Request, env?: any, ctx?: any) => Response | Promise<Response>) | undefined;

    constructor(impl: () => Promise<{
        http: HttpServer | Http2SecureServer | Deno.HttpServer | BunServer | null;
        ws: WebSocketServer;
        hostname: string;
        port: number;
        fetch: RequestHandler;
        controller: AbortController | null;
    }>) {
        this[_http] = impl().then(({ http, ws, hostname, port, fetch, controller }) => {
            this[_ws] = ws;
            this[_hostname] = hostname;
            this[_port] = port;
            this[_handler] = fetch;
            this[_controller] = controller;

            return http;
        });

        const _this = this;
        const { identity } = runtime();

        if (identity === "cloudflare-worker") {
            this.fetch = async (req, bindings, ctx) => {
                if (!_this[_handler]) {
                    return new Response("Service Unavailable", {
                        status: 503,
                        statusText: "Service Unavailable",
                    });
                }

                const { EventEndpoint } = await import("../sse.ts");
                const ws = _this[_ws]!;
                return _this[_handler](req, {
                    remoteAddress: null,
                    createEventEndpoint: () => {
                        const events = new EventEndpoint(req);
                        return { events, response: events.response! };
                    },
                    upgradeWebSocket: () => ws.upgrade(req),
                    waitUntil: ctx.waitUntil,
                    bindings,
                });
            };
        } else if (identity === "deno") {
            this.fetch = async (req) => {
                if (!_this[_handler]) {
                    return new Response("Service Unavailable", {
                        status: 503,
                        statusText: "Service Unavailable",
                    });
                }

                const { EventEndpoint } = await import("../sse.ts");
                const ws = _this[_ws]!;
                return _this[_handler](req, {
                    remoteAddress: null,
                    createEventEndpoint: () => {
                        const events = new EventEndpoint(req);
                        return { events, response: events.response! };
                    },
                    upgradeWebSocket: () => ws.upgrade(req),
                });
            };
        }
    }

    /**
     * The hostname of which the server is listening on, only available after
     * the server is ready.
     */
    get hostname(): string {
        return this[_hostname];
    }

    /**
     * The port of which the server is listening on, only available after the
     * server is ready.
     */
    get port(): number {
        return this[_port];
    }

    /**
     * A promise that resolves when the server is ready to accept connections.
     */
    get ready(): Promise<this> {
        return this[_http].then(() => this);
    }

    /**
     * Closes the server and stops it from accepting new connections. By default,
     * this function will wait until all active connections to close before
     * shutting down the server. However, we can force the server to close all
     * active connections and shutdown immediately by setting the `force`
     * parameter to `true`.
     * 
     * NOTE: In Node.js, the `force` parameter is only available for HTTP
     * servers, it has no effect on HTTP2 servers.
     */
    async close(force = false): Promise<void> {
        const server = await this[_http] as any;

        if (!server)
            return;

        if (typeof server.stop === "function") {
            const _server = server as BunServer;

            _server.stop(force);
            if (!force) {
                await until(() => !_server.pendingRequests && !_server.pendingWebSockets);
            }
        } else if (typeof server.shutdown === "function") {
            const _server = server as Deno.HttpServer;

            if (force && this[_controller]) {
                this[_controller].abort();
            } else {
                _server.shutdown();
            }

            await _server.finished;
        } else if (typeof server.close === "function") {
            const _server = server as HttpServer | Http2SecureServer;

            await new Promise<void>((resolve, reject) => {
                _server.close((err) => err ? reject(err) : resolve());

                if (force && "closeAllConnections" in _server) {
                    _server.closeAllConnections();
                }
            });
        }
    }

    /**
     * Opposite of `unref()`, calling `ref()` on a previously `unref`ed server
     * will _not_ let the program exit if it's the only server left (the default
     * behavior). If the server is `ref`ed calling `ref()` again will have no
     * effect.
     */
    ref(): void {
        this[_http].then(server => server?.ref?.());
    }

    /**
     * Calling `unref()` on a server will allow the program to exit if this is
     * the only active server in the event system. If the server is already
     * `unref`ed calling`unref()` again will have no effect.
     */
    unref(): void {
        this[_http].then(server => server?.unref?.());
    }
}
