import { WebSocketServer as WebSocketServer$2 } from 'ws';
import { concat, text } from '../bytes.js';
import { createErrorEvent, createCloseEvent } from '../event.js';
import { WebSocketServer as WebSocketServer$1, WebSocketConnection } from '../ws.js';

var _a;
const _errored = Symbol.for("errored");
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
            const isWebRequest = typeof Request === "function" && request instanceof Request;
            if (isWebRequest && Reflect.has(request, Symbol.for("incomingMessage"))) {
                request = Reflect.get(request, Symbol.for("incomingMessage"));
            }
            if (!("httpVersion" in request)) {
                return reject(new TypeError("Expected an instance of http.IncomingMessage"));
            }
            const { socket } = request;
            const upgradeHeader = request.headers.upgrade;
            if (!upgradeHeader || upgradeHeader !== "websocket") {
                return reject(new TypeError("Expected Upgrade: websocket"));
            }
            const listener = this[_listener];
            const clients = this[_clients];
            this[_server].handleUpgrade(request, socket, Buffer.alloc(0), (ws) => {
                const client = new WebSocketConnection(ws);
                clients.set(request, client);
                ws.on("message", (data, isBinary) => {
                    data = Array.isArray(data) ? concat(...data) : data;
                    let event;
                    if (typeof data === "string") {
                        event = new MessageEvent("message", { data });
                    }
                    else {
                        if (isBinary) {
                            event = new MessageEvent("message", {
                                data: new Uint8Array(data),
                            });
                        }
                        else {
                            const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
                            event = new MessageEvent("message", {
                                data: text(bytes),
                            });
                        }
                    }
                    client.dispatchEvent(event);
                });
                ws.on("error", error => {
                    Object.assign(ws, { [_errored]: true });
                    client.dispatchEvent(createErrorEvent("error", { error }));
                });
                ws.on("close", (code, reason) => {
                    var _b;
                    clients.delete(request);
                    client.dispatchEvent(createCloseEvent("close", {
                        code,
                        reason: (_b = reason === null || reason === void 0 ? void 0 : reason.toString("utf8")) !== null && _b !== void 0 ? _b : "",
                        wasClean: Reflect.get(ws, _errored) !== false,
                    }));
                });
                listener === null || listener === void 0 ? void 0 : listener.call(this, client);
                if (isWebRequest && typeof Response === "function") {
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
                    resolve({ socket: client, response });
                }
                else {
                    resolve({ socket: client });
                }
            });
        });
    }
}
_a = _clients;

export { WebSocketConnection, WebSocketServer };
//# sourceMappingURL=node.js.map
