import { asyncTask } from './async.js';
import { createErrorEvent, createCloseEvent } from './event.js';
import runtime from './runtime.js';

/**
 * This module provides a universal WebSocket server that works in Node.js, Deno,
 * Bun and Cloudflare Workers.
 *
 * NOTE: In order to work in Node.js, install the `@ayonli/jsext` library from
 * NPM instead of JSR.
 * @example
 */
var _a, _b, _c;
const _source = Symbol.for("source");
const _listener = Symbol.for("listener");
const _clients = Symbol.for("clients");
const _server = Symbol.for("server");
const _connTasks = Symbol.for("connTasks");
/**
 * This class represents a WebSocket connection on the server side.
 */
class WebSocketConnection extends EventTarget {
    constructor(socket) {
        super();
        this[_source] = socket;
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
                response: new Response(null, { status: 101 }),
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
                        wasClean: code === 1000,
                    }));
                }
            },
        };
    }
    get clients() {
        return this[_clients].values();
    }
};
_a = _clients, _b = _server, _c = _connTasks;

export { WebSocketConnection, WebSocketServer$1 as WebSocketServer };
//# sourceMappingURL=ws.js.map
