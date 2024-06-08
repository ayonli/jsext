import { WebSocketServer as WebSocketServer$2 } from 'ws';
import { concat, text } from '../bytes.js';
import { createErrorEvent, createCloseEvent } from '../event.js';
import { WebSocketServer as WebSocketServer$1, WebSocketConnection } from '../ws.js';

var _a;
const _listener = Symbol.for("listener");
const _clients = Symbol.for("clients");
const _server = Symbol.for("server");
class WebSocketServer extends WebSocketServer$1 {
    constructor(...args) {
        // @ts-ignore
        super(...args);
        this[_a] = new Map();
        this[_server] = new WebSocketServer$2({ noServer: true, perMessageDeflate: this.perMessageDeflate });
    }
    async upgrade(request) {
        return new Promise((resolve, reject) => {
            if (!("httpVersion" in request)) {
                return reject(new TypeError("Expected an instance of http.IncomingMessage"));
            }
            const { headers, socket } = request;
            const upgradeHeader = request.headers.upgrade;
            if (!upgradeHeader || upgradeHeader !== "websocket") {
                return reject(new TypeError("Expected Upgrade: websocket"));
            }
            const listener = this[_listener];
            const clients = this[_clients];
            this[_server].handleUpgrade(request, socket, Buffer.alloc(0), (ws) => {
                let origin = headers.origin;
                if (!origin) {
                    const host = headers.host;
                    origin = host ? `http://${host}` : "";
                }
                const client = new WebSocketConnection(ws);
                clients.set(request, client);
                ws.on("message", (data, isBinary) => {
                    data = Array.isArray(data) ? concat(...data) : data;
                    let event;
                    if (typeof data === "string") {
                        event = new MessageEvent("message", { data, origin });
                    }
                    else {
                        if (isBinary) {
                            event = new MessageEvent("message", {
                                data: new Uint8Array(data),
                                origin: origin,
                            });
                        }
                        else {
                            const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
                            event = new MessageEvent("message", {
                                data: text(bytes),
                                origin: origin,
                            });
                        }
                    }
                    client.dispatchEvent(event);
                });
                ws.on("error", error => {
                    client.dispatchEvent(createErrorEvent("error", { error }));
                });
                ws.on("close", (code, reason) => {
                    var _b;
                    clients.delete(request);
                    client.dispatchEvent(createCloseEvent("close", {
                        code: code !== null && code !== void 0 ? code : 1000,
                        reason: (_b = reason === null || reason === void 0 ? void 0 : reason.toString("utf8")) !== null && _b !== void 0 ? _b : "",
                        wasClean: code === 1000 || !code,
                    }));
                });
                setTimeout(() => {
                    // Ensure the open event is dispatched in the next tick of
                    // the event loop.
                    client.dispatchEvent(new Event("open"));
                });
                listener === null || listener === void 0 ? void 0 : listener.call(this, client);
                resolve({ socket: client });
            });
        });
    }
}
_a = _clients;

export { WebSocketConnection, WebSocketServer };
//# sourceMappingURL=node.js.map
