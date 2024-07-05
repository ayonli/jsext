import { createCloseEvent, createErrorEvent } from "../event";
import { ServerOptions, WebSocketConnection, WebSocketHandler } from "../ws/base.ts";

const _handler = Symbol.for("handler");
const _clients = Symbol.for("clients");

declare var WebSocketPair: {
    new(): [WebSocket, WebSocket & { accept: () => void; }];
};

export class WebSocketServer {
    protected idleTimeout: number;
    protected perMessageDeflate: boolean;
    protected [_handler]: WebSocketHandler | undefined;
    protected [_clients]: Map<Request, WebSocketConnection> = new Map();

    constructor(handler?: WebSocketHandler | undefined);
    constructor(options: ServerOptions, handler: WebSocketHandler);
    constructor(...args: any[]) {
        if (args.length === 2) {
            this.idleTimeout = args[0]?.idleTimeout || 30;
            this.perMessageDeflate = args[0]?.perMessageDeflate ?? false;
            this[_handler] = args[1];
        } else {
            this.idleTimeout = 30;
            this.perMessageDeflate = false;
            this[_handler] = args[0];
        }
    }

    async upgrade(request: Request): Promise<{ socket: WebSocketConnection; response: Response; }> {
        const upgradeHeader = request.headers.get("Upgrade");
        if (!upgradeHeader || upgradeHeader !== "websocket") {
            throw new TypeError("Expected Upgrade: websocket");
        }

        const handler = this[_handler];
        const clients = this[_clients];

        const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket & {
            accept: () => void;
        }];
        const socket = new WebSocketConnection(server);

        clients.set(request, socket);
        server.accept();
        server.addEventListener("message", ev => {
            if (typeof ev.data === "string") {
                socket.dispatchEvent(new MessageEvent("message", {
                    data: ev.data,
                }));
            } else if (ev.data instanceof ArrayBuffer) {
                socket.dispatchEvent(new MessageEvent("message", {
                    data: new Uint8Array(ev.data),
                }));
            } else {
                (ev.data as Blob).arrayBuffer().then(buffer => {
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
            handler?.call(this, socket);
        } else {
            server.addEventListener("open", () => {
                handler?.call(this, socket);
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
