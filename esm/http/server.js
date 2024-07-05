import runtime from '../runtime.js';

var _a, _b, _c, _d;
const _hostname = Symbol.for("hostname");
const _port = Symbol.for("port");
const _http = Symbol.for("http");
const _ws = Symbol.for("ws");
const _handler = Symbol.for("handler");
/**
 * A unified HTTP server interface.
 */
class Server {
    constructor(impl) {
        this[_a] = "";
        this[_b] = 0;
        this[_c] = null;
        this[_d] = null;
        this[_http] = impl().then(({ http, ws, hostname, port, fetch }) => {
            this[_ws] = ws;
            this[_hostname] = hostname;
            this[_port] = port;
            this[_handler] = fetch;
            return http;
        });
        const _this = this;
        const { identity } = runtime();
        if (identity === "cloudflare-worker") {
            this.fetch = (req, bindings, ctx) => {
                if (!_this[_handler]) {
                    return new Response("Service Unavailable", {
                        status: 503,
                        statusText: "Service Unavailable",
                    });
                }
                const ws = _this[_ws];
                return _this[_handler](req, {
                    remoteAddress: null,
                    upgradeWebSocket: () => ws.upgrade(req),
                    waitUntil: ctx.waitUntil,
                    bindings,
                });
            };
        }
        else if (identity === "deno") {
            this.fetch = (req) => {
                if (!_this[_handler]) {
                    return new Response("Service Unavailable", {
                        status: 503,
                        statusText: "Service Unavailable",
                    });
                }
                const ws = _this[_ws];
                return _this[_handler](req, {
                    remoteAddress: null,
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
     * Closes the server and stops it from accepting new connections.
     * @param force Terminate all active connections immediately.
     */
    async close(force = false) {
        const server = await this[_http];
        if (!server)
            return;
        if (typeof server.stop === "function") {
            server.stop(force);
        }
        else if (typeof server.shutdown === "function") {
            const _server = server;
            _server.shutdown();
            await _server.finished;
        }
        else if (typeof server.close === "function") {
            const _server = server;
            await new Promise((resolve, reject) => {
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
_a = _hostname, _b = _port, _c = _ws, _d = _handler;

export { Server };
//# sourceMappingURL=server.js.map
