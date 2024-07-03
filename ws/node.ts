import { type IncomingMessage } from "node:http";
import { WebSocketServer as WSServer } from "ws";
import { concat, text } from "../bytes.ts";
import { createCloseEvent, createErrorEvent } from "../event.ts";
import { type ServerOptions, WebSocketConnection, WebSocketServer as BaseServer, WebSocketHandler } from "../ws.ts";

export { WebSocketConnection };

const _errored = Symbol.for("errored");
const _handler = Symbol.for("handler");
const _clients = Symbol.for("clients");
const _server = Symbol.for("server");

export class WebSocketServer extends BaseServer {
    private [_handler]: WebSocketHandler | undefined;
    private [_clients] = new Map<import("http").IncomingMessage, WebSocketConnection>();
    private [_server]: WSServer;

    constructor();
    constructor(handler: WebSocketHandler);
    constructor(options: ServerOptions, handler: WebSocketHandler);
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
    override  upgrade(request: IncomingMessage,): Promise<{ socket: WebSocketConnection; }>;
    override async upgrade(request: Request | import("http").IncomingMessage): Promise<{
        socket: WebSocketConnection;
        response?: Response;
    }> {
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

            const handler = this[_handler];
            const clients = this[_clients];

            this[_server].handleUpgrade(request, socket, Buffer.alloc(0), (ws) => {
                const client = new WebSocketConnection(ws as any);

                clients.set(request as IncomingMessage, client);
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
                    Object.assign(ws, { [_errored]: true });
                    client.dispatchEvent(createErrorEvent("error", { error }));
                });
                ws.on("close", (code, reason) => {
                    clients.delete(request as IncomingMessage);
                    client.dispatchEvent(createCloseEvent("close", {
                        code,
                        reason: reason?.toString("utf8") ?? "",
                        wasClean: Reflect.get(ws, _errored) !== false,
                    }));
                });

                handler?.call(this, client);

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
                } else {
                    resolve({ socket: client });
                }
            });
        });
    }
}
