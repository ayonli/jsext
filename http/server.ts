import type { Server as HttpServer } from "node:http";
import type { Http2SecureServer, Http2Server } from "node:http2";
import type { WebSocketConnection, WebSocketHandler } from "../ws.ts";

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

/**
 * The handler for processing HTTP requests.
 */
export type RequestHandler = (request: Request, ctx: {
    remoteAddr: NetAddr;
    upgrade: (request: Request) => Promise<{ socket: WebSocketConnection; response: Response; }>;
}) => Response | Promise<Response>;

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

const _impl = Symbol.for("impl");

/**
 * A unified server interface for HTTP servers.
 */
export class Server {
    /**
     * The hostname of which the server is listening on.
     */
    readonly hostname: string;
    /**
     * The port of which the server is listening on.
     */
    readonly port: number;
    private [_impl]: HttpServer | Http2Server | Http2SecureServer | Deno.HttpServer | BunServer;

    constructor(options: {
        hostname: string;
        port: number;
    }, impl: HttpServer | Http2Server | Deno.HttpServer | BunServer) {
        this.hostname = options.hostname;
        this.port = options.port;
        this[_impl] = impl;
    }

    /**
     * Closes the server and stops it from accepting new connections.
     * @param force Terminate all active connections immediately.
     */
    async close(force = false): Promise<void> {
        const server = this[_impl] as any;

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
        this[_impl].ref?.();
    }

    /**
     * Calling `unref()` on a server will allow the program to exit if this is
     * the only active server in the event system. If the server is already
     * `unref`ed calling`unref()` again will have no effect.
     */
    unref(): void {
        this[_impl].unref?.();
    }
}
