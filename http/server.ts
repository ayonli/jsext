import type { Server as HttpServer } from "node:http";
import type { Http2SecureServer } from "node:http2";
import type { serve, serveStatic } from "../http.ts";
import type { WebSocketConnection, WebSocketHandler, WebSocketServer } from "../ws.ts";
import runtime from "../runtime.ts";

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

/**
 * Represents the network address of a connection peer.
 */
export interface NetAddress {
    family: "IPv4" | "IPv6";
    address: string;
    port: number;
}

export interface RequestContext {
    /**
     * The remote address of the client. This options is not available in
     * Cloudflare Workers or when the server is started with `deno serve`.
     */
    remoteAddress: NetAddress | null;
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
     * working directory will be used.
     */
    fsDir?: string;
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

/**
 * A unified HTTP server interface.
 */
export class Server {
    private [_hostname] = "";
    private [_port] = 0;
    private [_http]: Promise<HttpServer | Http2SecureServer | Deno.HttpServer | BunServer | null>;
    private [_ws]: WebSocketServer | null = null;
    private [_handler]: RequestHandler | null = null;

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
    }>) {
        this[_http] = impl().then(({ http, ws, hostname, port, fetch }) => {
            this[_ws] = ws;
            this[_hostname] = hostname;
            this[_port] = port;
            this[_handler] = fetch;

            return http;
        });

        const _this = this;
        const { identity } = runtime();

        if (identity === "cloudflare-worker") {
            this.fetch = (req, bindings, ctx) => {
                if (!_this[_handler]) {
                    return new Response("Service Unavailable", {
                        status: 503,
                        statusText: "Service Unavailable",
                    });
                }

                const ws = _this[_ws]!;
                return _this[_handler](req, {
                    remoteAddress: null,
                    upgradeWebSocket: () => ws.upgrade(req),
                    waitUntil: ctx.waitUntil,
                    bindings,
                });
            };
        } else if (identity === "deno") {
            this.fetch = (req) => {
                if (!_this[_handler]) {
                    return new Response("Service Unavailable", {
                        status: 503,
                        statusText: "Service Unavailable",
                    });
                }

                const ws = _this[_ws]!;
                return _this[_handler](req, {
                    remoteAddress: null,
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
     * Closes the server and stops it from accepting new connections.
     * @param force Terminate all active connections immediately.
     */
    async close(force = false): Promise<void> {
        const server = await this[_http] as any;

        if (!server)
            return;

        if (typeof server.stop === "function") {
            (server as BunServer).stop(force);
        } else if (typeof server.shutdown === "function") {
            const _server = server as Deno.HttpServer;
            _server.shutdown();
            await _server.finished;
        } else if (typeof server.close === "function") {
            const _server = server as HttpServer;

            await new Promise<void>((resolve, reject) => {
                if (force && typeof _server.closeAllConnections === "function") {
                    _server.closeAllConnections();
                }

                _server.close((err) => err ? reject(err) : resolve());
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
