import { type WebSocket, WebSocketServer as WSServer } from "ws";
import { concat } from "../bytes.ts";
import type { ServerListeners, ServerOptions, ConnectionOptions } from "../ws.ts";

const _source = Symbol.for("source");
const _url = Symbol.for("url");
const _context = Symbol.for("context");
const _listeners = Symbol.for("listeners");
const _clients = Symbol.for("clients");
const _server = Symbol.for("server");

export class WebSocketConnection<T = any> {
    private [_source]: WebSocket;
    private [_url]: string;
    private [_context]: T | undefined;

    constructor(source: WebSocket, options: ConnectionOptions<T>) {
        this[_source] = source;
        this[_url] = options.url;
        this[_context] = options.context;
    }

    get readyState(): number {
        return this[_source].readyState;
    }

    get url(): string {
        return this[_url];
    }

    get context(): T | undefined {
        return this[_context];
    }

    send(data: string | ArrayBufferLike | ArrayBufferView): void {
        this[_source].send(data);
    }

    close(code?: number, reason?: string): void {
        this[_source].close(code, reason);
    }
}

export class WebSocketServer<T = any> {
    private [_listeners]: ServerListeners<T>;
    private [_clients] = new Map<WebSocket, WebSocketConnection<T>>();
    private [_server] = new WSServer();
    private idleTimeout: number;
    private perMessageDeflate: boolean;

    constructor(listeners: ServerListeners<T>, options: ServerOptions) {
        const server = new WSServer(options);
        this[_server] = server;
        this[_listeners] = listeners;
        this.idleTimeout = options.idleTimeout ?? 30;
        this.perMessageDeflate = options.perMessageDeflate ?? false;

        server.on("connection", (_ws, req) => {

            const origin = req.headers.origin;
            const secure = origin?.startsWith("https://") ?? false;
            const url = new URL(req.url!,
                `${secure ? "wss" : "ws"}://${req.headers.host ?? "localhost"}`);
            const ws = new WebSocketConnection<T>(_ws, {
                url: url.toString(),
                context: (_ws as any)[_context],
            });

            const listeners = this[_listeners];
            const clients = this[_clients];

            clients.set(_ws, ws);
            _ws.on("message", (data) => {
                let event: MessageEvent<string | Uint8Array>;

                if (typeof data === "string") {
                    event = new MessageEvent("message", { data, origin: origin! });
                } else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
                    event = new MessageEvent("message", {
                        data: new Uint8Array(data),
                        origin: origin!,
                    });
                } else if (Array.isArray(data)) {
                    event = new MessageEvent("message", {
                        data: concat(...data),
                        origin: origin!,
                    });
                } else {
                    return; // unknown data type
                }

                listeners.message(ws as any, event);
            });
            _ws.on("open", () => listeners.open?.(ws as any, new Event("open")));
            _ws.on("error", () => listeners.error?.(ws as any, new Event("error")));
            _ws.on("close", (code = 1000, reason) => {
                listeners.close?.(ws as any, new CloseEvent("close", {
                    code,
                    reason: reason.toString("utf8"),
                    wasClean: code === 1000,
                }));
                clients.delete(_ws);
            });
        });
    }

    upgrade(
        request: import("http").IncomingMessage,
        socket: import("net").Socket,
        head: Buffer,
        context: T | undefined = undefined
    ): void {
        this[_server].handleUpgrade(request, socket, head, (ws) => {
            // @ts-ignore
            ws[_context] = context;
            this[_server].emit("connection", ws, request);
        });
    }

    get bunListener(): {
        idleTimeout: number;
        perMessageDeflate: boolean;
        message: (ws: any, message: any) => void;
        open: (ws: any) => void;
        error: (ws: any, error: any) => void;
        close: (ws: any, code: number, reason: string) => void;
    } {
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

    get clients(): IterableIterator<WebSocketConnection<T>> {
        return this[_clients].values();
    }
}
