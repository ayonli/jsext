import runtime from '../runtime.js';
import { until } from '../async.js';

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
    constructor(impl) {
        this[_a] = "";
        this[_b] = 0;
        this[_c] = null;
        this[_d] = null;
        this[_e] = null;
        this[_http] = impl().then(({ http, ws, hostname, port, fetch, controller }) => {
            this[_ws] = ws;
            this[_hostname] = hostname;
            this[_port] = port;
            this[_handler] = fetch;
            this[_controller] = controller;
            return http;
        });
        const _this = this;
        const { identity } = runtime();
        if (identity === "cloudflare-worker") {
            this.fetch = async (req, bindings, ctx) => {
                var _f;
                if (!_this[_handler]) {
                    return new Response("Service Unavailable", {
                        status: 503,
                        statusText: "Service Unavailable",
                    });
                }
                const { EventEndpoint } = await import('../sse.js');
                const ws = _this[_ws];
                return _this[_handler](req, {
                    remoteAddress: null,
                    createEventEndpoint: () => {
                        const events = new EventEndpoint(req);
                        return { events, response: events.response };
                    },
                    upgradeWebSocket: () => ws.upgrade(req),
                    waitUntil: (_f = ctx.waitUntil) === null || _f === void 0 ? void 0 : _f.bind(ctx),
                    bindings,
                });
            };
        }
        else if (identity === "deno") {
            this.fetch = async (req) => {
                if (!_this[_handler]) {
                    return new Response("Service Unavailable", {
                        status: 503,
                        statusText: "Service Unavailable",
                    });
                }
                const { EventEndpoint } = await import('../sse.js');
                const ws = _this[_ws];
                return _this[_handler](req, {
                    remoteAddress: null,
                    createEventEndpoint: () => {
                        const events = new EventEndpoint(req);
                        return { events, response: events.response };
                    },
                    upgradeWebSocket: () => ws.upgrade(req),
                });
            };
        }
    }
    /**
     * The hostname of which the server is listening on, only available after
     * the server is ready.
     */
    get hostname() {
        return this[_hostname];
    }
    /**
     * The port of which the server is listening on, only available after the
     * server is ready.
     */
    get port() {
        return this[_port];
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
