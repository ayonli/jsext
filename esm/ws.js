import { asyncTask } from './async.js';
import { concat, text } from './bytes.js';
import { createErrorEvent, createCloseEvent } from './event.js';
import runtime from './runtime.js';
import { WebSocketConnection } from './ws/base.js';
import { throwUnsupportedRuntimeError } from './error.js';
export { WebSocket, WebSocketStream, toWebSocketStream } from './ws/client.js';
import { NotSupportedError } from './error/common.js';

/**
 * This module provides unified WebSocket server and client interfaces for
 * Node.js, Deno, Bun and Cloudflare Workers.
 *
 * The {@link WebSocketServer} and {@link WebSocketConnection} are used to
 * manage WebSocket connections on the server side, while the {@link WebSocket}
 * (polyfill) and the {@link WebSocketStream} (polyfill) are used to connect to
 * WebSocket servers on the client side.
 *
 * **IMPORTANT**: The {@link WebSocketConnection} interface is an abstraction of
 * the WebSocket on the server side, it's design is not consistent with the
 * {@link WebSocket} API in the browser. For example, when receiving binary data,
 * the `data` property is always a `Uint8Array` object, which is different from
 * the `Blob` object (or `ArrayBuffer`) in the browser. In the future, a more
 * consistent API will be provided, be aware of this when using this module.
 * @module
 * @experimental
 */
var _a, _b, _c, _d;
const _errored = Symbol.for("errored");
const _handler = Symbol.for("handler");
const _clients = Symbol.for("clients");
const _httpServer = Symbol.for("httpServer");
const _wsServer = Symbol.for("wsServer");
const _connTasks = Symbol.for("connTasks");
const noNodeJSSupportError = new NotSupportedError("Node.js support is not implemented outside Node.js runtime.");
/**
 * A unified WebSocket server interface for Node.js, Deno, Bun and Cloudflare
 * Workers.
 *
 * There are two ways to handle WebSocket connections:
 *
 * 1. By passing a listener function to the constructor, handle all connections
 *    in a central place.
 * 2. By using the `socket` object returned from the `upgrade` method to handle
 *    each connection in a more flexible way. However, at this stage, the
 *    connection may not be ready yet, and we need to listen the `open` event
 *    or wait for the `ready` promise (deprecated) to resolve before we can
 *    start sending messages.
 *
 * The `socket` object is an async iterable object, which can be used in the
 * `for await...of` loop to read messages with backpressure support.
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
 * const httpServer = http.createServer(req => {
 *      wsServer.upgrade(req);
 * });
 * httpServer.listen(3000);
 *
 * // Node.js (withWeb)
 * import { withWeb } from "@ayonli/jsext/http";
 * const httpServer2 = http.createServer(withWeb(req => {
 *      const { response } = wsServer.upgrade(req);
 *      return response;
 * }));
 * httpServer2.listen(3001);
 *
 * // Bun
 * const bunServer = Bun.serve({
 *     fetch(req) {
 *         const { response } = wsServer.upgrade(req);
 *         return response;
 *     },
 *     websocket: wsServer.bunListener,
 * });
 * wsServer.bunBind(bunServer);
 *
 * // Deno
 * Deno.serve(req => {
 *     const { response } = wsServer.upgrade(req);
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
 * // per-request connection handler (Deno example)
 * import { WebSocketServer } from "@ayonli/jsext/ws";
 *
 * const wsServer = new WebSocketServer();
 *
 * Deno.serve(req => {
 *     const { socket, response } = wsServer.upgrade(req);
 *
 *     socket.addEventListener("open", () => {
 *         console.log("WebSocket connection established.");
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
 *
 *     // The response should be returned immediately, otherwise the web socket
 *     // will not be ready.
 *     return response;
 * });
 * ```
 *
 * @example
 * ```ts
 * // async iterable
 * const wsServer = new WebSocketServer(async socket => {
 *     console.log("WebSocket connection established.");
 *
 *     try {
 *         for await (const message of socket) {
 *             socket.send("received: " + message);
 *         }
 *     } catch (error) {
 *         console.error("WebSocket connection error:", error);
 *     }
 *
 *     console.log("WebSocket connection closed");
 * });
 *
 * Deno.serve(req => {
 *     const { response } = wsServer.upgrade(req);
 *     return response;
 * });
 * ```
 */
class WebSocketServer {
    constructor(...args) {
        var _e, _f, _g;
        this[_a] = new Map();
        this[_b] = undefined;
        this[_c] = null;
        this[_d] = new Map();
        if (args.length === 2) {
            this.idleTimeout = ((_e = args[0]) === null || _e === void 0 ? void 0 : _e.idleTimeout) || 30;
            this.perMessageDeflate = (_g = (_f = args[0]) === null || _f === void 0 ? void 0 : _f.perMessageDeflate) !== null && _g !== void 0 ? _g : false;
            this[_handler] = args[1];
        }
        else {
            this.idleTimeout = 30;
            this.perMessageDeflate = false;
            this[_handler] = args[0];
        }
    }
    upgrade(request) {
        const upgradeHeader = "socket" in request
            ? request.headers["upgrade"]
            : request.headers.get("Upgrade");
        if (!upgradeHeader || upgradeHeader !== "websocket") {
            throw new TypeError("Expected Upgrade: websocket");
        }
        const { identity } = runtime();
        if (identity === "deno") {
            if ("socket" in request) {
                throw noNodeJSSupportError;
            }
            return this.upgradeInDeno(request);
        }
        else if (identity === "bun") {
            if ("socket" in request) {
                throw noNodeJSSupportError;
            }
            return this.upgradeInBun(request);
        }
        else if (identity === "node") {
            const isNodeRequest = "socket" in request;
            if (!isNodeRequest && Reflect.has(request, Symbol.for("incomingMessage"))) {
                request = Reflect.get(request, Symbol.for("incomingMessage"));
            }
            if (!("socket" in request)) {
                throw new TypeError("Expected an instance of http.IncomingMessage.");
            }
            return this.upgradeInNode(request, isNodeRequest);
        }
        else {
            throwUnsupportedRuntimeError();
        }
    }
    upgradeInDeno(request) {
        const handler = this[_handler];
        const clients = this[_clients];
        const { socket: ws, response } = Deno.upgradeWebSocket(request, {
            idleTimeout: this.idleTimeout,
        });
        const socket = new WebSocketConnection(new Promise((resolve) => {
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
            if (ws.readyState === 1) {
                resolve(ws);
            }
            else {
                ws.onopen = () => {
                    resolve(ws);
                };
            }
        }));
        socket.ready.then(() => {
            clients.set(request, socket);
            handler === null || handler === void 0 ? void 0 : handler.call(this, socket);
            socket.dispatchEvent(new Event("open"));
        });
        return { socket, response };
    }
    upgradeInBun(request) {
        const handler = this[_handler];
        const clients = this[_clients];
        const server = this[_httpServer];
        if (!server) {
            throw new TypeError("WebSocket server is not bound to a Bun server instance.");
        }
        const task = asyncTask();
        this[_connTasks].set(request, task);
        const ok = server.upgrade(request, { data: { request } });
        if (!ok) {
            throw new Error("Failed to upgrade to WebSocket.");
        }
        const socket = new WebSocketConnection(task);
        socket.ready.then(() => {
            clients.set(request, socket);
            handler === null || handler === void 0 ? void 0 : handler.call(this, socket);
            socket.dispatchEvent(new Event("open"));
        });
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
    upgradeInNode(request, isNodeRequest) {
        const handler = this[_handler];
        const clients = this[_clients];
        if (!this[_wsServer]) {
            this[_wsServer] = import('ws').then(({ WebSocketServer: WsServer }) => {
                return new WsServer({
                    noServer: true,
                    perMessageDeflate: this.perMessageDeflate,
                });
            });
        }
        const task = this[_wsServer].then(wsServer => new Promise((resolve) => {
            const { socket } = request;
            try { // Prepare for upgrade.
                // This is actually how Node.js does before emitting the `upgrade`
                // event.
                // Prevent the socket from timing out.
                socket.setTimeout(0);
                // Remove all existing listeners, this is important, otherwise the
                // connection will not work properly, for example, the connection
                // may close prematurely.
                socket.eventNames().forEach(name => {
                    socket.removeAllListeners(name);
                });
                // @ts-ignore internal state
                socket.readableFlowing = null;
            }
            catch (_e) { }
            wsServer.handleUpgrade(request, socket, Buffer.alloc(0), (ws) => {
                ws.binaryType = "arraybuffer";
                ws.on("message", (data, isBinary) => {
                    data = Array.isArray(data) ? concat(...data) : data;
                    let event;
                    if (typeof data === "string") {
                        event = new MessageEvent("message", { data });
                    }
                    else if (isBinary) {
                        event = new MessageEvent("message", {
                            data: new Uint8Array(data),
                        });
                    }
                    else {
                        const bytes = data instanceof ArrayBuffer
                            ? new Uint8Array(data)
                            : data;
                        event = new MessageEvent("message", {
                            data: text(bytes),
                        });
                    }
                    client.dispatchEvent(event);
                });
                ws.on("error", error => {
                    Object.assign(ws, { [_errored]: true });
                    client.dispatchEvent(createErrorEvent("error", { error }));
                });
                ws.on("close", (code, reason) => {
                    var _e;
                    clients.delete(request);
                    client.dispatchEvent(createCloseEvent("close", {
                        code,
                        reason: (_e = reason === null || reason === void 0 ? void 0 : reason.toString("utf8")) !== null && _e !== void 0 ? _e : "",
                        wasClean: Reflect.get(ws, _errored) !== false,
                    }));
                });
                resolve(ws);
            });
        }));
        const client = new WebSocketConnection(task);
        client.ready.then(() => {
            clients.set(request, client);
            handler === null || handler === void 0 ? void 0 : handler.call(this, client);
            client.dispatchEvent(new Event("open"));
        });
        if (!isNodeRequest && typeof Response === "function") {
            const response = new Response(null, {
                status: 200,
                statusText: "Switching Protocols",
                headers: new Headers({
                    "Upgrade": "websocket",
                    "Connection": "Upgrade",
                }),
            });
            // HACK: Node.js currently does not support setting the
            // status code to outside the range of 200 to 599. This
            // is a workaround to set the status code to 101.
            Object.defineProperty(response, "status", {
                configurable: true,
                value: 101,
            });
            return { socket: client, response };
        }
        else {
            return { socket: client };
        }
    }
    /**
     * Used in Bun, to bind the WebSocket server to the Bun server instance.
     */
    bunBind(server) {
        this[_httpServer] = server;
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
            open: async (ws) => {
                const { request } = ws.data;
                const task = connTasks.get(request);
                if (task) {
                    connTasks.delete(request);
                    task.resolve(ws);
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
}
_a = _clients, _b = _httpServer, _c = _wsServer, _d = _connTasks;

export { WebSocketServer };
//# sourceMappingURL=ws.js.map
