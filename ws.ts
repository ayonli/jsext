/**
 * This module provides a universal WebSocket server interface for Node.js, Deno,
 * Bun and Cloudflare Workers. This module is based on the `EventTarget`
 * interface and conforms the web standard.
 * 
 * NOTE: In order to work in Node.js, install the `@ayonli/jsext` library from
 * NPM instead of JSR.
 * 
 * NOTE: In Node.js, this module requires Node.js v15 or above, and is only
 * available in with the `http` and `https` modules, `http2` is not supported.
 * @module
 * @experimental
 */

import { AsyncTask, asyncTask } from "./async.ts";
import chan from "./chan.ts";
import { fromErrorEvent } from "./error.ts";
import { createCloseEvent, createErrorEvent } from "./event.ts";
import runtime from "./runtime.ts";

const _source = Symbol.for("source");
const _errored = Symbol.for("errored");
const _listener = Symbol.for("listener");
const _clients = Symbol.for("clients");
const _server = Symbol.for("server");
const _connTasks = Symbol.for("connTasks");

export type WebSocketLike = Pick<WebSocket, "readyState" | "close" | "send">;

export type BunServerType = {
    upgrade(req: Request, options: { data: any; }): boolean;
};

/**
 * This class represents a WebSocket connection on the server side.
 * Normally we don't create instances of this class directly, but rather use
 * the {@link WebSocketServer} to handle WebSocket connections, which will
 * create the instance for us.
 * 
 * **Events:**
 * 
 * - `error` - Dispatched when an error occurs, such as network failure. After
 *   this event is dispatched, the connection will be closed and the `close`
 *   event will be dispatched.
 * - `close` - Dispatched when the connection is closed. If the connection is
 *   closed due to some error, the `error` event will be dispatched before this
 *   event, and the close event will have the `wasClean` set to `false`, and the
 *   `reason` property contains the error message, if any.
 * - `message` - Dispatched when a message is received.
 */
export class WebSocketConnection extends EventTarget implements AsyncIterable<string | Uint8Array> {
    private [_source]: WebSocketLike;

    constructor(source: WebSocketLike) {
        super();
        this[_source] = source;
    }

    /**
     * The current state of the WebSocket connection.
     */
    get readyState(): number {
        return this[_source].readyState;
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

    /**
     * Adds an event listener that will be called when the connection is
     * interrupted. After this event is dispatched, the connection will be
     * closed and the `close` event will be dispatched.
     */
    override addEventListener(
        type: "error",
        listener: (this: WebSocketConnection, ev: ErrorEvent) => void,
        options?: boolean | AddEventListenerOptions
    ): void;
    /**
     * Adds an event listener that will be called when the connection is closed.
     * If the connection is closed due to some error, the `error` event will be
     * dispatched before this event, and the close event will have the `wasClean`
     * set to `false`, and the `reason` property contains the error message, if
     * any.
     */
    override addEventListener(
        type: "close",
        listener: (this: WebSocketConnection, ev: CloseEvent) => void,
        options?: boolean | AddEventListenerOptions
    ): void;
    /**
     * Adds an event listener that will be called when a message is received.
     */
    override addEventListener(
        type: "message",
        listener: (this: WebSocketConnection, ev: MessageEvent<string | Uint8Array>) => void,
        options?: boolean | AddEventListenerOptions
    ): void;
    override addEventListener(
        type: string,
        listener: (this: WebSocketConnection, event: Event) => any,
        options?: boolean | AddEventListenerOptions
    ): void;
    override addEventListener(
        event: string,
        listener: any,
        options?: boolean | AddEventListenerOptions
    ): void {
        return super.addEventListener(
            event,
            listener as EventListenerOrEventListenerObject,
            options
        );
    }

    async *[Symbol.asyncIterator](): AsyncIterableIterator<string | Uint8Array> {
        const channel = chan<string | Uint8Array>(Infinity);

        this.addEventListener("message", ev => {
            channel.send(ev.data);
        });
        this.addEventListener("close", ev => {
            ev.wasClean && channel.close();
        });
        this.addEventListener("error", ev => {
            channel.close(fromErrorEvent(ev));
        });

        for await (const data of channel) {
            yield data;
        }
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
     * NOTE: Currently, this option is only supported in Deno and Bun, in other
     * environments, the option is ignored.
     */
    idleTimeout?: number;
    /**
     * Whether to enable per-message deflate compression.
     * 
     * NOTE: Currently, this option is only supported in Node.js and Bun, in
     * other environments, the option is ignored.
     */
    perMessageDeflate?: boolean;
}

/**
 * A universal WebSocket server interface for Node.js, Deno, Bun and Cloudflare
 * Workers.
 * 
 * There are two ways to handle WebSocket connections:
 * 
 * 1. By passing a listener function to the constructor, handle all connections
 *    in a central place.
 * 2. By using the `socket` object returned from the `upgrade` method to handle
 *    each connection in a more flexible way.
 * 
 * Also, the `socket` object is an async iterable object, which can be used in
 * the `for await...of` loop to read messages with backpressure support.
 * 
 * NOTE: In order to work in Node.js, install the `@ayonli/jsext` library from
 * NPM instead of JSR.
 * 
 * @example
 * ```ts
 * // centralized connection handler
 * import { WebSocketServer } from "@ayonli/jsext/ws";
 * 
 * const wsServer = new WebSocketServer(socket => {
 *     console.log("WebSocket connection established.");
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
 * // Node.js (withWeb)
 * import { withWeb } from "@ayonli/jsext/http";
 * const httpServer2 = http.createServer(withWeb(async (req) => {
 *      const { response } = await wsServer.upgrade(req);
 *      return response;
 * }));
 * httpServer2.listen(3001);
 * 
 * // Bun
 * const bunServer = Bun.serve({
 *     async fetch(req) {
 *         const { response } = await wsServer.upgrade(req);
 *         return response;
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
 * 
 * @example
 * ```ts
 * // per-request connection handler (e.g. for Deno)
 * import { WebSocketServer } from "@ayonli/jsext/ws";
 * 
 * const wsServer = new WebSocketServer();
 * 
 * Deno.serve(async req => {
 *     const { socket, response } = await wsServer.upgrade(req);
 * 
 *     console.log("WebSocket connection established.");
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
 * 
 *     return response;
 * });
 * ```
 * 
 * @example
 * ```ts
 * // async iterable (e.g. for Deno)
 * const wsServer = new WebSocketServer(async socket => {
 *     console.log("WebSocket connection established.");
 * 
 *     try {
 *         for await (const message of socket) {
 *             socket.send("received: " + event.data);
 *         }
 *     } catch (error) {
 *         console.error("WebSocket connection error:", error);
 *     }
 * 
 *     console.log("WebSocket connection closed");
 * });
 * 
 * Deno.serve(async req => {
 *     const { response } = await wsServer.upgrade(req);
 *     return response;
 * });
 * ```
 */
export class WebSocketServer {
    protected idleTimeout: number;
    protected perMessageDeflate: boolean;
    protected [_listener]: ((socket: WebSocketConnection) => void) | undefined;
    protected [_clients]: Map<Request, WebSocketConnection> = new Map();
    private [_server]: BunServerType | undefined = undefined;
    private [_connTasks]: Map<Request, AsyncTask<WebSocketConnection>> = new Map();

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
     * This function can also be used in Node.js if the HTTP request listener is
     * created using the `withWeb` function from `@ayonli/jsext/http` module.
     * 
     * NOTE: This function fails if the request is not a WebSocket upgrade request.
     */
    upgrade(request: Request): Promise<{ socket: WebSocketConnection; response: Response; }>;
    /**
     * Upgrades the request to a WebSocket connection in Node.js.
     * 
     * NOTE: This function fails if the request is not a WebSocket upgrade request.
     */
    upgrade(request: import("http").IncomingMessage,): Promise<{ socket: WebSocketConnection; }>;
    async upgrade(request: Request | import("http").IncomingMessage,): Promise<{
        socket: WebSocketConnection;
        response?: Response;
    }> {
        if (!(request instanceof Request)) {
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
            ws.onmessage = (ev) => {
                if (typeof ev.data === "string") {
                    socket.dispatchEvent(new MessageEvent("message", {
                        data: ev.data,
                    }));
                } else {
                    socket.dispatchEvent(new MessageEvent("message", {
                        data: new Uint8Array(ev.data as ArrayBuffer),
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

            await new Promise<any>((resolve) => {
                ws.onopen = resolve;
            });

            listener?.call(this, socket);
            return { socket, response };
        } else if (identity === "cloudflare-worker") {
            // @ts-ignore
            const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket & {
                accept: () => void;
            }];
            const socket = new WebSocketConnection(server);

            clients.set(request, socket);
            server.accept();
            server.addEventListener("message", ev => {
                if (typeof ev.data === "string") {
                    socket.dispatchEvent(new MessageEvent("message", {
                        data: ev.data,
                    }));
                } else if (ev.data instanceof ArrayBuffer) {
                    socket.dispatchEvent(new MessageEvent("message", {
                        data: new Uint8Array(ev.data),
                    }));
                } else {
                    (ev.data as Blob).arrayBuffer().then(buffer => {
                        socket.dispatchEvent(new MessageEvent("message", {
                            data: new Uint8Array(buffer),
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
                    statusText: "Switching Protocols",
                    headers: new Headers({
                        "Upgrade": "websocket",
                        "Connection": "Upgrade",
                    }),
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
                response: new Response(null, {
                    status: 101,
                    statusText: "Switching Protocols",
                    headers: new Headers({
                        "Upgrade": "websocket",
                        "Connection": "Upgrade",
                    }),
                }),
            };
        } else {
            throw new TypeError("Unsupported runtime");
        }
    }

    /**
     * Used in Bun, to bind the WebSocket server to the Bun server instance.
     */
    bunBind(server: BunServerType): void {
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

                const task = connTasks.get(request);
                if (task) {
                    connTasks.delete(request);
                    task.resolve(client);
                }
            },
            message: (ws: ServerWebSocket, msg: string | ArrayBuffer | Uint8Array) => {
                const { request } = ws.data;
                const client = clients.get(request);

                if (client) {
                    if (typeof msg === "string") {
                        client.dispatchEvent(new MessageEvent("message", {
                            data: msg,
                        }));
                    } else {
                        client.dispatchEvent(new MessageEvent("message", {
                            data: new Uint8Array(msg),
                        }));
                    }
                }
            },
            error: (ws: ServerWebSocket, error: Error) => {
                Object.assign(ws, { [_errored]: true });
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
                        wasClean: Reflect.get(ws, _errored) !== true,
                    }));
                }
            },
        };
    }

    /**
     * An iterator that yields all connected WebSocket clients, can be used to
     * broadcast messages to all clients.
     */
    get clients(): IterableIterator<WebSocketConnection> {
        return this[_clients].values();
    }
}
