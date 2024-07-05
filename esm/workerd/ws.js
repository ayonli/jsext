import { createErrorEvent, createCloseEvent } from '../event.js';
import { WebSocketConnection } from '../ws/base.js';

var _a;
const _handler = Symbol.for("handler");
const _clients = Symbol.for("clients");
class WebSocketServer {
    constructor(...args) {
        var _b, _c, _d;
        this[_a] = new Map();
        if (args.length === 2) {
            this.idleTimeout = ((_b = args[0]) === null || _b === void 0 ? void 0 : _b.idleTimeout) || 30;
            this.perMessageDeflate = (_d = (_c = args[0]) === null || _c === void 0 ? void 0 : _c.perMessageDeflate) !== null && _d !== void 0 ? _d : false;
            this[_handler] = args[1];
        }
        else {
            this.idleTimeout = 30;
            this.perMessageDeflate = false;
            this[_handler] = args[0];
        }
    }
    async upgrade(request) {
        const upgradeHeader = request.headers.get("Upgrade");
        if (!upgradeHeader || upgradeHeader !== "websocket") {
            throw new TypeError("Expected Upgrade: websocket");
        }
        const handler = this[_handler];
        const clients = this[_clients];
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
        if (socket.readyState === 1) {
            handler === null || handler === void 0 ? void 0 : handler.call(this, socket);
        }
        else {
            server.addEventListener("open", () => {
                handler === null || handler === void 0 ? void 0 : handler.call(this, socket);
            });
        }
        return {
            socket,
            response: new Response(null, {
                status: 101,
                // @ts-ignore
                webSocket: client,
            }),
        };
    }
}
_a = _clients;

export { WebSocketServer };
//# sourceMappingURL=ws.js.map
