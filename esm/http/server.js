import { until } from '../async.js';
import { isDeno, isNode, isBun } from '../env.js';
import runtime, { env } from '../runtime.js';
import { EventEndpoint } from '../sse.js';

var _a, _b, _c, _d;
const _hostname = Symbol.for("hostname");
const _port = Symbol.for("port");
const _http = Symbol.for("http");
const _ws = Symbol.for("ws");
const _controller = Symbol.for("controller");
/**
 * A unified HTTP server interface.
 */
class Server {
    constructor(impl, options) {
        var _e, _f, _g;
        this[_a] = "";
        this[_b] = 0;
        this[_c] = null;
        this[_d] = null;
        this.type = (_e = options.type) !== null && _e !== void 0 ? _e : "classic";
        const { fetch: handle, secure } = options;
        const onError = (_f = options.onError) !== null && _f !== void 0 ? _f : ((err) => {
            console.error(err);
            return new Response("Internal Server Error", {
                status: 500,
                statusText: "Internal Server Error",
            });
        });
        const onListen = (_g = options.onListen) !== null && _g !== void 0 ? _g : (({ hostname, port }) => {
            const _hostname = hostname === "0.0.0.0" ? "localhost" : hostname;
            const protocol = secure ? "https" : "http";
            console.log(`Server listening on ${protocol}://${_hostname}:${port}`);
        });
        this[_http] = impl().then(({ http, ws, hostname, port, controller }) => {
            this[_ws] = ws;
            this[_hostname] = hostname;
            this[_port] = port;
            this[_controller] = controller;
            if (http) {
                onListen({ hostname, port });
            }
            return http;
        });
        const _this = this;
        if (isDeno) {
            if (this.type === "classic") {
                delete this.fetch;
            }
            else {
                this.fetch = async (request) => {
                    const ws = _this[_ws];
                    const ctx = {
                        remoteAddress: null,
                        createEventEndpoint: () => {
                            const events = new EventEndpoint(request);
                            return { events, response: events.response };
                        },
                        upgradeWebSocket: () => ws.upgrade(request),
                    };
                    try {
                        return await handle(request, ctx);
                    }
                    catch (err) {
                        return await onError(err, request, ctx);
                    }
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
                    var _e, _f, _g;
                    const { request } = event;
                    const ws = _this[_ws];
                    const address = (_e = request.headers.get("cf-connecting-ip")) !== null && _e !== void 0 ? _e : (_f = event.client) === null || _f === void 0 ? void 0 : _f.address;
                    const ctx = {
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
                        waitUntil: (_g = event.waitUntil) === null || _g === void 0 ? void 0 : _g.bind(event),
                        bindings,
                    };
                    const response = Promise.resolve(handle(request, ctx))
                        .catch(err => onError(err, request, ctx));
                    event.respondWith(response);
                });
            }
            else {
                this.fetch = async (request, bindings, _ctx) => {
                    var _e;
                    if (bindings && typeof bindings === "object" && !Array.isArray(bindings)) {
                        env(bindings);
                    }
                    const ws = _this[_ws];
                    const address = request.headers.get("cf-connecting-ip");
                    const ctx = {
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
                        waitUntil: (_e = _ctx.waitUntil) === null || _e === void 0 ? void 0 : _e.bind(_ctx),
                        bindings,
                    };
                    try {
                        return await handle(request, ctx);
                    }
                    catch (err) {
                        return await onError(err, request, ctx);
                    }
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
        this[_http].then(server => { var _e; return (_e = server === null || server === void 0 ? void 0 : server.ref) === null || _e === void 0 ? void 0 : _e.call(server); });
    }
    /**
     * Calling `unref()` on a server will allow the program to exit if this is
     * the only active server in the event system. If the server is already
     * `unref`ed calling`unref()` again will have no effect.
     */
    unref() {
        this[_http].then(server => { var _e; return (_e = server === null || server === void 0 ? void 0 : server.unref) === null || _e === void 0 ? void 0 : _e.call(server); });
    }
}
_a = _hostname, _b = _port, _c = _ws, _d = _controller;

export { Server };
//# sourceMappingURL=server.js.map
