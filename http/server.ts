import type { Server as HttpServer } from "node:http";
import type { Http2SecureServer } from "node:http2";
import type { WebSocketConnection, WebSocketHandler, WebSocketServer } from "../ws.ts";

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
export interface NetAddr {
    family: "IPv4" | "IPv6";
    address: string;
    port: number;
}

export interface RequestContext {
    /**
     * The remote address of the client. Only available in Node.js, Deno and Bun.
     */
    remoteAddr: NetAddr | null;
    /**
     * Upgrades the request to a WebSocket connection.
     */
    upgrade(request: Request): Promise<{ socket: WebSocketConnection; response: Response; }>;
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

const _hostname = Symbol.for("hostname");
const _port = Symbol.for("port");
const _http = Symbol.for("http");
const _ws = Symbol.for("ws");
const _handler = Symbol.for("handler");

/**
 * A unified server interface for HTTP servers.
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
     * 
     * NOTE: This method is only available in Cloudflare Workers.
     * 
     * @example
     * ```ts
     * import { serve } from "@ayonli/jsext/http";
     * 
     * const server = serve({
     *      fetch(req) {
     *          return new Response("Hello, World!");
     *      }
     * });
     * 
     * export default {
     *     fetch: server.fetch,
     * };
     * ```
     */
    readonly fetch: (req: Request, bindings: any, ctx: any) => Response | Promise<Response>;

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
        this.fetch = (req, bindings, ctx) => {
            if (!_this[_handler])
                return new Response("Service Unavailable", { status: 503 });

            const ws = _this[_ws]!;

            if (typeof ctx === "object") { // Cloudflare Worker
                return _this[_handler](req, {
                    remoteAddr: null,
                    upgrade: ws.upgrade.bind(ws),
                    waitUntil: ctx.waitUntil,
                    bindings,
                });
            } else { // Unsupported environment
                return new Response("Service Unavailable", { status: 503 });
            }
        };
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
