const _impl = Symbol.for("impl");
/**
 * A unified server interface for HTTP servers.
 */
class Server {
    constructor(options, impl) {
        this.hostname = options.hostname;
        this.port = options.port;
        this[_impl] = impl;
    }
    /**
     * Closes the server and stops it from accepting new connections.
     * @param force Terminate all active connections immediately.
     */
    async close(force = false) {
        const server = this[_impl];
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
        var _a, _b;
        (_b = (_a = this[_impl]).ref) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    /**
     * Calling `unref()` on a server will allow the program to exit if this is
     * the only active server in the event system. If the server is already
     * `unref`ed calling`unref()` again will have no effect.
     */
    unref() {
        var _a, _b;
        (_b = (_a = this[_impl]).unref) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
}

export { Server };
//# sourceMappingURL=server.js.map
