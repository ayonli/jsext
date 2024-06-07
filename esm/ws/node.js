import { WebSocketServer as WebSocketServer$1 } from 'ws';
import { concat } from '../bytes.js';

var _a, _b;
const _source = Symbol.for("source");
const _url = Symbol.for("url");
const _context = Symbol.for("context");
const _listeners = Symbol.for("listeners");
const _clients = Symbol.for("clients");
const _server = Symbol.for("server");
class WebSocketConnection {
    constructor(source, options) {
        this[_source] = source;
        this[_url] = options.url;
        this[_context] = options.context;
    }
    get readyState() {
        return this[_source].readyState;
    }
    get url() {
        return this[_url];
    }
    get context() {
        return this[_context];
    }
    send(data) {
        this[_source].send(data);
    }
    close(code, reason) {
        this[_source].close(code, reason);
    }
}
class WebSocketServer {
    constructor(listeners, options) {
        var _c, _d;
        this[_a] = new Map();
        this[_b] = new WebSocketServer$1();
        const server = new WebSocketServer$1(options);
        this[_server] = server;
        this[_listeners] = listeners;
        this.idleTimeout = (_c = options.idleTimeout) !== null && _c !== void 0 ? _c : 30;
        this.perMessageDeflate = (_d = options.perMessageDeflate) !== null && _d !== void 0 ? _d : false;
        server.on("connection", (_ws, req) => {
            var _c, _d;
            const origin = req.headers.origin;
            const secure = (_c = origin === null || origin === void 0 ? void 0 : origin.startsWith("https://")) !== null && _c !== void 0 ? _c : false;
            const url = new URL(req.url, `${secure ? "wss" : "ws"}://${(_d = req.headers.host) !== null && _d !== void 0 ? _d : "localhost"}`);
            const ws = new WebSocketConnection(_ws, {
                url: url.toString(),
                context: _ws[_context],
            });
            const listeners = this[_listeners];
            const clients = this[_clients];
            clients.set(_ws, ws);
            _ws.on("message", (data) => {
                let event;
                if (typeof data === "string") {
                    event = new MessageEvent("message", { data, origin: origin });
                }
                else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
                    event = new MessageEvent("message", {
                        data: new Uint8Array(data),
                        origin: origin,
                    });
                }
                else if (Array.isArray(data)) {
                    event = new MessageEvent("message", {
                        data: concat(...data),
                        origin: origin,
                    });
                }
                else {
                    return; // unknown data type
                }
                listeners.message(ws, event);
            });
            _ws.on("open", () => { var _c; return (_c = listeners.open) === null || _c === void 0 ? void 0 : _c.call(listeners, ws, new Event("open")); });
            _ws.on("error", () => { var _c; return (_c = listeners.error) === null || _c === void 0 ? void 0 : _c.call(listeners, ws, new Event("error")); });
            _ws.on("close", (code = 1000, reason) => {
                var _c;
                (_c = listeners.close) === null || _c === void 0 ? void 0 : _c.call(listeners, ws, new CloseEvent("close", {
                    code,
                    reason: reason.toString("utf8"),
                    wasClean: code === 1000,
                }));
                clients.delete(_ws);
            });
        });
    }
    upgrade(request, socket, head, context = undefined) {
        this[_server].handleUpgrade(request, socket, head, (ws) => {
            // @ts-ignore
            ws[_context] = context;
            this[_server].emit("connection", ws, request);
        });
    }
    get bunListener() {
        return {
            idleTimeout: this.idleTimeout,
            perMessageDeflate: this.perMessageDeflate,
            // no-op stubs
            message: () => { },
            open: () => { },
            error: () => { },
            close: () => { },
        };
    }
    get clients() {
        return this[_clients].values();
    }
}
_a = _clients, _b = _server;

export { WebSocketConnection, WebSocketServer };
//# sourceMappingURL=node.js.map
