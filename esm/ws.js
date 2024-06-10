import { asyncTask } from './async.js';
import { createErrorEvent, createCloseEvent } from './event.js';
import runtime from './runtime.js';

/**
 * This module provides a universal WebSocket server interface for Node.js, Deno,
 * Bun and Cloudflare Workers. This module is based on the `EventTarget`
 * interface and conforms the web standard.
 *
 * NOTE: In order to work in Node.js, install the `@ayonli/jsext` library from
 * NPM instead of JSR.
 *
 * NOTE: In Node.js, this module requires Node.js v16.5 or above, and is only
 * available in with the `http` and `https` modules, `http2` is not supported.
 * @module
 * @experimental
 */
var _a, _b, _c;
const _source = Symbol.for("source");
const _errored = Symbol.for("errored");
const _listener = Symbol.for("listener");
const _clients = Symbol.for("clients");
const _server = Symbol.for("server");
const _connTasks = Symbol.for("connTasks");
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
class WebSocketConnection extends EventTarget {
    constructor(source) {
        super();
        this[_source] = source;
    }
    /**
     * The current state of the WebSocket connection.
     */
    get readyState() {
        return this[_source].readyState;
    }
    /**
     * Sends data to the WebSocket client.
     */
    send(data) {
        this[_source].send(data);
    }
    /**
     * Closes the WebSocket connection.
     */
    close(code, reason) {
        this[_source].close(code, reason);
    }
    addEventListener(event, listener, options) {
        return super.addEventListener(event, listener, options);
    }
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
 * NOTE: In order to work in Node.js, install the `@ayonli/jsext` library from
 * NPM instead of JSR.
 *
 * @example
 * ```ts
 * // centralized connection handler
 * import { WebSocketServer } from "@ayonli/jsext/ws";
 *
 * const wsServer = new WebSocketServer(socket => {
 *     console.log(`WebSocket connection established.`);
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
 *     console.log(`WebSocket connection established.`);
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
 */
let WebSocketServer$1 = class WebSocketServer {
    constructor(...args) {
        var _d, _e, _f;
        this[_a] = new Map();
        this[_b] = undefined;
        this[_c] = new Map();
        if (args.length === 2) {
            this.idleTimeout = ((_d = args[0]) === null || _d === void 0 ? void 0 : _d.idleTimeout) || 30;
            this.perMessageDeflate = (_f = (_e = args[0]) === null || _e === void 0 ? void 0 : _e.perMessageDeflate) !== null && _f !== void 0 ? _f : false;
            this[_listener] = args[1];
        }
        else {
            this.idleTimeout = 30;
            this.perMessageDeflate = false;
            this[_listener] = args[0];
        }
    }
    async upgrade(request) {
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
                }
                else {
                    socket.dispatchEvent(new MessageEvent("message", {
                        data: new Uint8Array(ev.data),
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
            await new Promise((resolve) => {
                ws.onopen = resolve;
            });
            listener === null || listener === void 0 ? void 0 : listener.call(this, socket);
            return { socket, response };
        }
        else if (identity === "cloudflare-worker") {
            // @ts-ignore
            const [client, server] = Object.values(new WebSocketPair());
            const socket = new WebSocketConnection(server);
            clients.set(request, socket);
            server.accept();
            server.addEventListener("message", ev => {
                if (typeof ev.data === "string") {
                    socket.dispatchEvent(new MessageEvent("message", {
                        data: ev.data,
                    }));
                }
                else if (ev.data instanceof ArrayBuffer) {
                    socket.dispatchEvent(new MessageEvent("message", {
                        data: new Uint8Array(ev.data),
                    }));
                }
                else {
                    ev.data.arrayBuffer().then(buffer => {
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
            listener === null || listener === void 0 ? void 0 : listener.call(this, socket);
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
        }
        else if (identity === "bun") {
            const server = this[_server];
            if (!server) {
                throw new Error("WebSocket server is not bound to a Bun server instance.");
            }
            const task = asyncTask();
            this[_connTasks].set(request, task);
            const ok = server.upgrade(request, { data: { request } });
            if (!ok) {
                throw new Error("Failed to upgrade to WebSocket");
            }
            const socket = await task;
            listener === null || listener === void 0 ? void 0 : listener.call(this, socket);
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
        }
        else {
            throw new TypeError("Unsupported runtime");
        }
    }
    /**
     * Used in Bun, to bind the WebSocket server to the Bun server instance.
     */
    bunBind(server) {
        this[_server] = server;
    }
    /**
     * A WebSocket listener for `Bun.serve()`.
     */
    get bunListener() {
        const clients = this[_clients];
        const connTasks = this[_connTasks];
        return {
            idleTimeout: this.idleTimeout,
            perMessageDeflate: this.perMessageDeflate,
            open: (ws) => {
                const { request } = ws.data;
                const client = new WebSocketConnection(ws);
                clients.set(request, client);
                const task = connTasks.get(request);
                if (task) {
                    connTasks.delete(request);
                    task.resolve(client);
                }
            },
            message: (ws, msg) => {
                const { request } = ws.data;
                const client = clients.get(request);
                if (client) {
                    if (typeof msg === "string") {
                        client.dispatchEvent(new MessageEvent("message", {
                            data: msg,
                        }));
                    }
                    else {
                        client.dispatchEvent(new MessageEvent("message", {
                            data: new Uint8Array(msg),
                        }));
                    }
                }
            },
            error: (ws, error) => {
                Object.assign(ws, { [_errored]: true });
                const { request } = ws.data;
                const client = clients.get(request);
                client && client.dispatchEvent(createErrorEvent("error", { error }));
            },
            close: (ws, code, reason) => {
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
    get clients() {
        return this[_clients].values();
    }
};
_a = _clients, _b = _server, _c = _connTasks;

export { WebSocketConnection, WebSocketServer$1 as WebSocketServer };
//# sourceMappingURL=ws.js.map
