/**
 * This module provides a universal WebSocket server that works in Node.js, Deno,
 * Bun and Cloudflare Workers.
 * 
 * NOTE: In order to work in Node.js, install the `@ayonli/jsext` library from
 * NPM instead of JSR.
 * @example
 */

import { AsyncTask, asyncTask } from "./async.ts";
import { createCloseEvent, createErrorEvent } from "./event.ts";
import runtime from "./runtime.ts";
import { type Optional } from "./types.ts";

const _source = Symbol.for("source");
const _listener = Symbol.for("listener");
const _clients = Symbol.for("clients");
const _server = Symbol.for("server");
const _connTasks = Symbol.for("connTasks");

export type WebSocketLike = Optional<Pick<WebSocket, "readyState" | "close" | "send">, "readyState">;

export type BunServerType = {
    upgrade(req: Request, options: { data: any; }): boolean;
};

/**
 * Options for the {@link WebSocketConnection} constructor.
 */
export interface ConnectionOptions {
    /**
     * The URL of the WebSocket connection.
     */
    url: string;
}

/**
 * This class represents a WebSocket connection on the server side.
 */
export class WebSocketConnection extends EventTarget {
    private [_source]: WebSocketLike;

    constructor(socket: WebSocketLike) {
        super();
        this[_source] = socket;
    }

    /**
     * The current state of the WebSocket connection.
     */
    get readyState(): 0 | 1 | 2 | 3 {
        return this[_source].readyState as 0 | 1 | 2 | 3 | undefined ?? 1;
    }

    /**
     * Sends data to the WebSocket client.
     */
    send(data: string | ArrayBufferLike | ArrayBufferView): void {
        this[_source].send(data);
    }

    /**
     * Closes the WebSocket connection.
     */
    close(code?: number | undefined, reason?: string | undefined): void {
        this[_source].close(code, reason);
    }
}

/**
 * Options for the {@link WebSocketServer} constructor.
 */
export interface ServerOptions {
    /**
     * The idle timeout in seconds. The server will close the connection if no
     * messages are received within this time.
     * 
     * NOTE: This option may not be supported in some runtime.
     */
    idleTimeout?: number;
    /**
     * Whether to enable per-message deflate compression.
     * 
     * NOTE: This option may not be supported in some runtime.
     */
    perMessageDeflate?: boolean;
}

/**
 * A universal WebSocket server that works in Node.js, Deno, Bun and Cloudflare
 * Workers.
 * 
 * NOTE: In order to work in Node.js, install the `@ayonli/jsext` library from
 * NPM instead of JSR.
 * 
 * @example
 * ```ts
 * import { WebSocketServer } from "@ayonli/jsext/ws";
 * 
 * const wsServer = new WebSocketServer(socket => {
 *     socket.addEventListener("open", () => {
 *         console.log(`WebSocket connection established.`);
 *     });
 * 
 *     socket.addEventListener("message", (event) => {
 *         socket.send("received: " + event.data);
 *     });
 * 
 *     socket.addEventListener("error", (event) => {
 *         console.error("WebSocket connection error:", event.error);
 *     });
 * 
 *     socket.addEventListener("close", (event) => {
 *         console.log(`WebSocket connection closed, reason: ${event.reason}, code: ${event.code}`);
 *     });
 * });
 * 
 * // Node.js
 * import * as http from "node:http";
 * const httpServer = http.createServer(async (req) => {
 *      await wsServer.upgrade(req);
 * });
 * httpServer.listen(3000);
 * 
 * // Bun
 * const bunServer = Bun.serve({
 *     async fetch(req) {
 *         await wsServer.upgrade(req);
 *     },
 *     websocket: wsServer.bunListener,
 * });
 * wsServer.bunBind(bunServer);
 * 
 * // Deno
 * Deno.serve(async req => {
 *     const { response } = await wsServer.upgrade(req);
 *     return response;
 * });
 * 
 * // Cloudflare Workers
 * export default {
 *     fetch(req) {
 *         const { response } = wsServer.upgrade(req);
 *         return response;
 *     },
 * };
 * ```
 */
export class WebSocketServer {
    protected idleTimeout: number;
    protected perMessageDeflate: boolean;
    protected [_listener]: ((socket: WebSocketConnection) => void) | undefined;
    protected [_clients] = new Map<Request, WebSocketConnection>();
    private [_server]: BunServerType | undefined = undefined;
    private [_connTasks] = new Map<Request, AsyncTask<WebSocketConnection>>();

    constructor();
    constructor(listener: (socket: WebSocketConnection) => void);
    constructor(options: ServerOptions, listener: (socket: WebSocketConnection) => void);
    constructor(...args: any[]) {
        if (args.length === 2) {
            this.idleTimeout = args[0]?.idleTimeout || 30;
            this.perMessageDeflate = args[0]?.perMessageDeflate ?? false;
            this[_listener] = args[1];
        } else {
            this.idleTimeout = 30;
            this.perMessageDeflate = false;
            this[_listener] = args[0];
        }
    }

    /**
     * Upgrades the request to a WebSocket connection in Deno, Bun and Cloudflare
     * Workers.
     * 
     * @param context The context data to attach to the connection.
     */
    upgrade(request: Request): Promise<{ socket: WebSocketConnection; response: Response; }>;
    /**
     * Upgrades the request to a WebSocket connection in Node.js.
     */
    upgrade(request: import("http").IncomingMessage,): Promise<{ socket: WebSocketConnection; }>;
    async upgrade(request: Request | import("http").IncomingMessage,): Promise<{
        socket: WebSocketConnection;
        response?: Response;
    }> {
        if ("httpVersion" in request) {
            throw new TypeError("Node.js support is not implemented");
        }

        const upgradeHeader = request.headers.get("Upgrade");
        if (!upgradeHeader || upgradeHeader !== "websocket") {
            throw new TypeError("Expected Upgrade: websocket");
        }

        const listener = this[_listener];
        const clients = this[_clients];
        const { identity } = runtime();

        if (identity === "deno") {
            const { socket: ws, response } = Deno.upgradeWebSocket(request, {
                idleTimeout: this.idleTimeout,
            });
            const socket = new WebSocketConnection(ws);

            clients.set(request, socket);
            ws.binaryType = "arraybuffer";
            ws.onopen = () => {
                setTimeout(() => {
                    // Ensure the open event is dispatched in the next tick of
                    // the event loop.
                    socket.dispatchEvent(new Event("open"));
                });
            };
            ws.onmessage = (ev) => {
                if (typeof ev.data === "string") {
                    socket.dispatchEvent(new MessageEvent("message", {
                        data: ev.data,
                        origin: ev.origin,
                    }));
                } else {
                    socket.dispatchEvent(new MessageEvent("message", {
                        data: new Uint8Array(ev.data as ArrayBuffer),
                        origin: ev.origin,
                    }));
                }
            };
            ws.onclose = (ev) => {
                if (!ev.wasClean) {
                    socket.dispatchEvent(createErrorEvent("error", {
                        error: new Error(`WebSocket connection closed: ${ev.reason} (${ev.code})`),
                    }));
                }

                clients.delete(request);
                socket.dispatchEvent(createCloseEvent("close", {
                    code: ev.code,
                    reason: ev.reason,
                    wasClean: ev.wasClean,
                }));
            };

            listener?.call(this, socket);
            return { socket, response };
        } else if (identity === "cloudflare-worker") {
            // @ts-ignore
            const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket & {
                accept: () => void;
            }];
            const socket = new WebSocketConnection(client);

            clients.set(request, socket);
            server.accept();

            setTimeout(() => {
                // Cloudflare Workers does not support the open event, we call it
                // manually here.
                socket.dispatchEvent(new Event("open"));
            });

            server.addEventListener("message", ev => {
                if (typeof ev.data === "string") {
                    socket.dispatchEvent(new MessageEvent("message", {
                        data: ev.data,
                        origin: ev.origin,
                    }));
                } else if (ev.data instanceof ArrayBuffer) {
                    socket.dispatchEvent(new MessageEvent("message", {
                        data: new Uint8Array(ev.data),
                        origin: ev.origin,
                    }));
                } else {
                    (ev.data as Blob).arrayBuffer().then(buffer => {
                        socket.dispatchEvent(new MessageEvent("message", {
                            data: new Uint8Array(buffer),
                            origin: ev.origin,
                        }));
                    }).catch(() => { });
                }
            });
            server.addEventListener("close", ev => {
                if (!ev.wasClean) {
                    socket.dispatchEvent(createErrorEvent("error", {
                        error: new Error(`WebSocket connection closed: ${ev.reason} (${ev.code})`),
                    }));
                }

                clients.delete(request);
                socket.dispatchEvent(createCloseEvent("close", {
                    code: ev.code,
                    reason: ev.reason,
                    wasClean: ev.wasClean,
                }));
            });

            listener?.call(this, socket);
            return {
                socket,
                response: new Response(null, {
                    status: 101,
                    // @ts-ignore
                    webSocket: client,
                }),
            };
        } else if (identity === "bun") {
            const server = this[_server];
            if (!server) {
                throw new Error("WebSocket server is not bound to a Bun server instance.");
            }

            const task = asyncTask<WebSocketConnection>();
            this[_connTasks].set(request, task);

            const ok: boolean = server.upgrade(request, { data: { request } });
            if (!ok) {
                throw new Error("Failed to upgrade to WebSocket");
            }

            const socket = await task;

            listener?.call(this, socket);
            return {
                socket,
                response: new Response(null, { status: 101 }),
            };
        } else {
            throw new TypeError("Unsupported runtime");
        }
    }

    /**
     * Used in Bun, to bind the WebSocket server to the Bun server instance.
     */
    bunBind(server: BunServerType) {
        this[_server] = server;
    }

    /**
     * A WebSocket listener for `Bun.serve()`.
     */
    get bunListener(): {
        idleTimeout: number;
        perMessageDeflate: boolean;
        message: (ws: any, message: string | ArrayBuffer | Uint8Array) => void;
        open: (ws: any) => void;
        error: (ws: any, error: Error) => void;
        close: (ws: any, code: number, reason: string) => void;
    } {
        const clients = this[_clients];
        const connTasks = this[_connTasks];
        type ServerWebSocket = WebSocket & { data: { request: Request; }; };

        return {
            idleTimeout: this.idleTimeout,
            perMessageDeflate: this.perMessageDeflate,
            open: (ws: ServerWebSocket) => {
                const { request } = ws.data;
                const client = new WebSocketConnection(ws);
                clients.set(request, client);

                setTimeout(() => {
                    // Ensure the open event is dispatched in the next tick of
                    // the event loop.
                    client.dispatchEvent(new Event("open"));
                });

                const task = connTasks.get(request);
                if (task) {
                    connTasks.delete(request);
                    task.resolve(client);
                }
            },
            message: (ws: ServerWebSocket, msg: string | ArrayBuffer | Uint8Array) => {
                const { request } = ws.data;
                let origin = request.headers.get("origin");

                if (!origin) {
                    const url = request.url || `http://${request.headers.get("host")}`;
                    origin = new URL(url).origin;
                }

                const client = clients.get(request);

                if (client) {
                    if (typeof msg === "string") {
                        client.dispatchEvent(new MessageEvent("message", {
                            data: msg,
                            origin,
                        }));
                    } else {
                        client.dispatchEvent(new MessageEvent("message", {
                            data: new Uint8Array(msg),
                            origin,
                        }));
                    }
                }
            },
            error: (ws: ServerWebSocket, error: Error) => {
                const { request } = ws.data;
                const client = clients.get(request);
                client && client.dispatchEvent(createErrorEvent("error", { error }));
            },
            close: (ws: ServerWebSocket, code: number, reason: string) => {
                const { request } = ws.data;
                const client = clients.get(request);

                if (client) {
                    clients.delete(request);
                    client.dispatchEvent(createCloseEvent("close", {
                        code,
                        reason,
                        wasClean: code === 1000,
                    }));
                }
            },
        };
    }

    get clients(): IterableIterator<WebSocketConnection> {
        return this[_clients].values();
    }
}