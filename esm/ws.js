import runtime from './runtime.js';

/**
 * This module provides a universal WebSocket server that works in Node.js, Deno,
 * Bun and Cloudflare Workers.
 * @example
 */
var _a;
const _source = Symbol.for("source");
const _url = Symbol.for("url");
const _context = Symbol.for("context");
const _listeners = Symbol.for("listeners");
const _clients = Symbol.for("clients");
/**
 * The state of a WebSocket connection.
 */
var ConnectionState;
(function (ConnectionState) {
    ConnectionState[ConnectionState["CONNECTING"] = 0] = "CONNECTING";
    ConnectionState[ConnectionState["OPEN"] = 1] = "OPEN";
    ConnectionState[ConnectionState["CLOSING"] = 2] = "CLOSING";
    ConnectionState[ConnectionState["CLOSED"] = 3] = "CLOSED";
})(ConnectionState || (ConnectionState = {}));
/**
 * Represents a WebSocket connection on the server side.
 */
class WebSocketConnection {
    constructor(socket, options) {
        this[_source] = socket;
        this[_url] = options.url;
        this[_context] = options.context;
    }
    /**
     * The current state of the WebSocket connection.
     */
    get readyState() {
        var _b;
        return (_b = this[_source].readyState) !== null && _b !== void 0 ? _b : ConnectionState.OPEN;
    }
    /**
     * The URL of the WebSocket connection.
     */
    get url() {
        return this[_url];
    }
    /**
     * The context data attached to the connection.
     */
    get context() {
        return this[_context];
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
}
/**
 * A universal WebSocket server that works in Node.js, Deno, Bun and Cloudflare
 * Workers.
 *
 * @example
 * ```ts
 * const wsServer = new WebSocketServer({
 *     message(ws, event) {
 *         ws.send("received: " + event.data);
 *     },
 *     open(ws, event) {
 *         console.log(`WebSocket connection established.`);
 *     },
 *     close(ws, event) {
 *         console.log("WebSocket connection closed, reason: ${event.reason}, code: ${event.code}");
 *     },
 *     error(ws, event) {
 *         console.error("WebSocket connection error:", event);
 *     },
 * });
 *
 * // Node.js
 * const httpServer = http.createServer((req, res) => {});
 * httpServer.on("upgrade", (req, socket, head) => {
 *     wsServer.upgrade(req, socket, head);
 * });
 * httpServer.listen(3000);
 *
 * // Deno
 * Deno.serve(req => {
 *     const { response } = wsServer.upgrade(req);
 *     return response;
 * });
 *
 * // Bun
 * Bun.serve({
 *     fetch(req, server) {
 *         const { ok, response } = wsServer.upgrade(req, server);
 *         if (ok) {
 *             return undefined;
 *         } else {
 *             return response;
 *         }
 *     },
 *     websocket: wsServer.bunListener,
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
class WebSocketServer {
    constructor(listeners, options) {
        var _b;
        this[_a] = new Map();
        this[_listeners] = listeners;
        this.idleTimeout = (options === null || options === void 0 ? void 0 : options.idleTimeout) || 30;
        this.perMessageDeflate = (_b = options === null || options === void 0 ? void 0 : options.perMessageDeflate) !== null && _b !== void 0 ? _b : false;
    }
    upgrade(request, ...args) {
        var _b;
        if ("httpVersion" in request) {
            throw new TypeError("Node.js support is not implemented");
        }
        const upgradeHeader = request.headers.get("Upgrade");
        if (!upgradeHeader || upgradeHeader !== "websocket") {
            return {
                ok: false,
                response: new Response("Expected Upgrade: websocket", {
                    status: 426,
                }),
            };
        }
        const listeners = this[_listeners];
        const clients = this[_clients];
        const { identity } = runtime();
        if (identity === "deno") {
            try {
                const context = args[0];
                const { socket, response } = Deno.upgradeWebSocket(request, {
                    idleTimeout: this.idleTimeout,
                });
                const ws = new WebSocketConnection(socket, { url: socket.url, context });
                clients.set(socket, ws);
                socket.binaryType = "arraybuffer";
                socket.onmessage = (_event) => {
                    let event;
                    if (typeof _event.data === "string") {
                        event = new MessageEvent("message", {
                            data: _event.data,
                            origin: _event.origin,
                        });
                    }
                    else {
                        event = new MessageEvent("message", {
                            data: new Uint8Array(_event.data),
                            origin: _event.origin,
                        });
                    }
                    listeners.message(ws, event);
                };
                socket.onopen = (event) => { var _b; return (_b = listeners.open) === null || _b === void 0 ? void 0 : _b.call(listeners, ws, event); };
                socket.onerror = (event) => { var _b; return (_b = listeners.error) === null || _b === void 0 ? void 0 : _b.call(listeners, ws, event); };
                socket.onclose = (event) => {
                    var _b;
                    (_b = listeners.close) === null || _b === void 0 ? void 0 : _b.call(listeners, ws, event);
                    clients.delete(socket);
                };
                return { ok: true, response };
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                return { ok: false, response: new Response(msg, { status: 426 }) };
            }
        }
        else if (identity === "cloudflare-worker") {
            const context = args[0];
            // @ts-ignore
            const [client, server] = Object.values(new WebSocketPair());
            const ws = new WebSocketConnection(client, { url: request.url, context });
            clients.set(client, ws);
            server.accept();
            server.addEventListener("message", _event => {
                let event;
                if (typeof _event.data === "string") {
                    event = new MessageEvent("message", {
                        data: _event.data,
                        origin: _event.origin,
                    });
                    listeners.message(ws, event);
                }
                else if (_event.data instanceof ArrayBuffer) {
                    event = new MessageEvent("message", {
                        data: new Uint8Array(_event.data),
                        origin: _event.origin,
                    });
                    listeners.message(ws, event);
                }
                else {
                    _event.data.arrayBuffer().then(buffer => {
                        event = new MessageEvent("message", {
                            data: new Uint8Array(buffer),
                            origin: _event.origin,
                        });
                        listeners.message(ws, event);
                    }).catch(() => { });
                }
            });
            server.addEventListener("error", event => { var _b; return (_b = listeners.error) === null || _b === void 0 ? void 0 : _b.call(listeners, ws, event); });
            server.addEventListener("close", event => {
                var _b;
                (_b = listeners.close) === null || _b === void 0 ? void 0 : _b.call(listeners, ws, event);
                clients.delete(client);
            });
            // Cloudflare Workers does not support the open event, we call it
            // manually here.
            (_b = listeners.open) === null || _b === void 0 ? void 0 : _b.call(listeners, ws, new Event("open"));
            return {
                ok: true,
                response: new Response(null, {
                    status: 101,
                    // @ts-ignore
                    webSocket: client,
                }),
            };
        }
        else if (identity === "bun") {
            const server = args[0];
            const context = args[1];
            const ok = server.upgrade(request, {
                data: {
                    url: request.url,
                    context,
                },
            });
            const response = new Response(ok ? null : "Upgrade to WebSocket failed", {
                status: ok ? 101 : 426,
            });
            return { ok, response };
        }
        else {
            throw new TypeError("Unsupported runtime");
        }
    }
    /**
     * A WebSocket listener for `Bun.serve()`.
     */
    get bunListener() {
        const listeners = this[_listeners];
        const clients = this[_clients];
        return {
            idleTimeout: this.idleTimeout,
            perMessageDeflate: this.perMessageDeflate,
            message(_ws, message) {
                const ws = clients.get(_ws);
                ws && listeners.message(ws, message);
            },
            open(_ws) {
                var _b;
                const ws = new WebSocketConnection(_ws, _ws.data);
                clients.set(_ws, ws);
                (_b = listeners.open) === null || _b === void 0 ? void 0 : _b.call(listeners, ws, new Event("open"));
            },
            error(_ws) {
                var _b;
                const ws = clients.get(_ws);
                ws && ((_b = listeners.error) === null || _b === void 0 ? void 0 : _b.call(listeners, ws, new Event("error")));
            },
            close(_ws, code, reason) {
                var _b;
                const ws = clients.get(_ws);
                ws && ((_b = listeners.close) === null || _b === void 0 ? void 0 : _b.call(listeners, ws, new CloseEvent("close", { code, reason })));
                clients.delete(_ws);
            },
        };
    }
    get clients() {
        return this[_clients].values();
    }
}
_a = _clients;

export { ConnectionState, WebSocketConnection, WebSocketServer };
//# sourceMappingURL=ws.js.map
