import { WebSocketServer as WSServer } from "ws";
import { concat, text } from "../bytes.ts";
import { createCloseEvent, createErrorEvent } from "../event.ts";
import { type ServerOptions, WebSocketConnection, WebSocketServer as BaseServer } from "../ws.ts";

export { WebSocketConnection };

const _listener = Symbol.for("listener");
const _clients = Symbol.for("clients");
const _server = Symbol.for("server");

export class WebSocketServer extends BaseServer {
    private [_listener]: ((socket: WebSocketConnection) => void) | undefined;
    private [_clients] = new Map<import("http").IncomingMessage, WebSocketConnection>();
    private [_server]: WSServer;

    constructor();
    constructor(listener: (socket: WebSocketConnection) => void);
    constructor(options: ServerOptions, listener: (socket: WebSocketConnection) => void);
    constructor(...args: any[]) {
        // @ts-ignore
        super(...args);
        this[_server] = new WSServer({ noServer: true, perMessageDeflate: this.perMessageDeflate });
    }

    override upgrade(request: Request): Promise<{ socket: WebSocketConnection; response: Response; }>;
    override upgrade(
        request: Request,
        server: { upgrade(req: Request, options: { data: any; }): boolean; }
    ): Promise<{ socket: WebSocketConnection; }>;
    override  upgrade(request: import("http").IncomingMessage,): Promise<{ socket: WebSocketConnection; }>;
    override async upgrade(request: Request | import("http").IncomingMessage): Promise<{
        socket: WebSocketConnection;
        response?: Response;
    }> {
        return new Promise((resolve, reject) => {
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
                const client = new WebSocketConnection(ws as any);

                clients.set(request, client);
                ws.on("message", (data, isBinary) => {
                    data = Array.isArray(data) ? concat(...data) : data;
                    let event: MessageEvent<string | Uint8Array>;

                    if (typeof data === "string") {
                        event = new MessageEvent("message", { data });
                    } else {
                        if (isBinary) {
                            event = new MessageEvent("message", {
                                data: new Uint8Array(data),
                            });
                        } else {
                            const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
                            event = new MessageEvent("message", {
                                data: text(bytes),
                            });
                        }
                    }

                    client.dispatchEvent(event);
                });
                ws.on("error", error => {
                    client.dispatchEvent(createErrorEvent("error", { error }));
                });
                ws.on("close", (code, reason) => {
                    clients.delete(request);
                    client.dispatchEvent(createCloseEvent("close", {
                        code: code ?? 1000,
                        reason: reason?.toString("utf8") ?? "",
                        wasClean: code === 1000 || !code,
                    }));
                });

                setTimeout(() => {
                    // Ensure the open event is dispatched in the next tick of
                    // the event loop.
                    client.dispatchEvent(new Event("open"));
                });

                listener?.call(this, client);
                resolve({ socket: client });
            });
        });
    }
}
