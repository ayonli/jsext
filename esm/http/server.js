import { until } from '../async.js';
import { isDeno, isNode, isBun } from '../env.js';
import runtime, { env } from '../runtime.js';
import { EventEndpoint } from '../sse.js';

var _a, _b, _c, _d, _e;
const _hostname = Symbol.for("hostname");
const _port = Symbol.for("port");
const _http = Symbol.for("http");
const _ws = Symbol.for("ws");
const _handler = Symbol.for("handler");
const _controller = Symbol.for("controller");
/**
 * A unified HTTP server interface.
 */
class Server {
    constructor(impl, options = {}) {
        var _f;
        this[_a] = "";
        this[_b] = 0;
        this[_c] = null;
        this[_d] = null;
        this[_e] = null;
        this.type = (_f = options.type) !== null && _f !== void 0 ? _f : "classic";
        this[_http] = impl().then(({ http, ws, hostname, port, fetch, controller }) => {
            this[_ws] = ws;
            this[_hostname] = hostname;
            this[_port] = port;
            this[_handler] = fetch;
            this[_controller] = controller;
            return http;
        });
        const _this = this;
        if (isDeno) {
            if (this.type === "classic") {
                delete this.fetch;
            }
            else {
                this.fetch = async (request) => {
                    if (!_this[_handler]) {
                        return new Response("Service Unavailable", {
                            status: 503,
                            statusText: "Service Unavailable",
                        });
                    }
                    const ws = _this[_ws];
                    return _this[_handler](request, {
                        remoteAddress: null,
                        createEventEndpoint: () => {
                            const events = new EventEndpoint(request);
                            return { events, response: events.response };
                        },
                        upgradeWebSocket: () => ws.upgrade(request),
                    });
                };
            }
        }
        else if (!isNode && !isBun && typeof addEventListener === "function") {
            if (this.type === "classic") {
                let bindings;
                if (runtime().type === "workerd") {
                    bindings = {};
                    Object.keys(globalThis).forEach((key) => {
                        if (/^[A-Z0-9_]+$/.test(key)) {
                            // @ts-ignore
                            bindings[key] = globalThis[key];
                        }
                    });
                    env(bindings);
                }
                // @ts-ignore
                addEventListener("fetch", (event) => {
                    var _f, _g, _h;
                    if (!_this[_handler]) {
                        event.respondWith(new Response("Service Unavailable", {
                            status: 503,
                            statusText: "Service Unavailable",
                        }));
                        return;
                    }
                    const { request } = event;
                    const ws = _this[_ws];
                    const handle = _this[_handler];
                    const address = (_f = request.headers.get("cf-connecting-ip")) !== null && _f !== void 0 ? _f : (_g = event.client) === null || _g === void 0 ? void 0 : _g.address;
                    event.respondWith(handle(request, {
                        remoteAddress: address ? {
                            family: address.includes(":") ? "IPv6" : "IPv4",
                            address: address,
                            port: 0,
                        } : null,
                        createEventEndpoint: () => {
                            const events = new EventEndpoint(request);
                            return { events, response: events.response };
                        },
                        upgradeWebSocket: () => ws.upgrade(request),
                        waitUntil: (_h = event.waitUntil) === null || _h === void 0 ? void 0 : _h.bind(event),
                        bindings,
                    }));
                });
            }
            else {
                this.fetch = async (request, bindings, ctx) => {
                    var _f;
                    if (!_this[_handler]) {
                        return new Response("Service Unavailable", {
                            status: 503,
                            statusText: "Service Unavailable",
                        });
                    }
                    if (bindings && typeof bindings === "object" && !Array.isArray(bindings)) {
                        env(bindings);
                    }
                    const ws = _this[_ws];
                    const handle = _this[_handler];
                    const address = request.headers.get("cf-connecting-ip");
                    return handle(request, {
                        remoteAddress: address ? {
                            family: address.includes(":") ? "IPv6" : "IPv4",
                            address: address,
                            port: 0,
                        } : null,
                        createEventEndpoint: () => {
                            const events = new EventEndpoint(request);
                            return { events, response: events.response };
                        },
                        upgradeWebSocket: () => ws.upgrade(request),
                        waitUntil: (_f = ctx.waitUntil) === null || _f === void 0 ? void 0 : _f.bind(ctx),
                        bindings,
                    });
                };
            }
        }
    }
    /**
     * The hostname of which the server is listening on, only available after
     * the server is ready.
     */
    get hostname() {
        return this[_hostname] || "localhost";
    }
    /**
     * The port of which the server is listening on, only available after the
     * server is ready.
     */
    get port() {
        const { type } = runtime();
        if (this[_port]) {
            return this[_port];
        }
        else if (type === "deno") {
            return 8000;
        }
        else if (type === "workerd") {
            return 8787;
        }
        else if (type === "fastly") {
            return 7676;
        }
        else {
            return 0;
        }
    }
    /**
     * A promise that resolves when the server is ready to accept connections.
     */
    get ready() {
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
    async close(force = false) {
        const server = await this[_http];
        if (!server)
            return;
        if (typeof server.stop === "function") {
            const _server = server;
            _server.stop(force);
            if (!force) {
                await until(() => !_server.pendingRequests && !_server.pendingWebSockets);
            }
        }
        else if (typeof server.shutdown === "function") {
            const _server = server;
            if (force && this[_controller]) {
                this[_controller].abort();
            }
            else {
                _server.shutdown();
            }
            await _server.finished;
        }
        else if (typeof server.close === "function") {
            const _server = server;
            await new Promise((resolve, reject) => {
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
    ref() {
        this[_http].then(server => { var _f; return (_f = server === null || server === void 0 ? void 0 : server.ref) === null || _f === void 0 ? void 0 : _f.call(server); });
    }
    /**
     * Calling `unref()` on a server will allow the program to exit if this is
     * the only active server in the event system. If the server is already
     * `unref`ed calling`unref()` again will have no effect.
     */
    unref() {
        this[_http].then(server => { var _f; return (_f = server === null || server === void 0 ? void 0 : server.unref) === null || _f === void 0 ? void 0 : _f.call(server); });
    }
}
_a = _hostname, _b = _port, _c = _ws, _d = _handler, _e = _controller;

export { Server };
//# sourceMappingURL=server.js.map
