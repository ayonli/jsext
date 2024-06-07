/**
 * This module provides a universal WebSocket server that works in Node.js, Deno,
 * Bun and Cloudflare Workers.
 * @example
 */

export interface ServerWebSocket<T = any> {
    readyState: number;
    data: T;

    close(code?: number, reason?: string): void;
    send(data: string | ArrayBufferLike | ArrayBufferView | Blob): void;
}

export interface WebSocketServerListeners<T = any> {
    message: (ws: ServerWebSocket<T>, event: MessageEvent<string | Uint8Array>) => void | Promise<void>;
    open?: (ws: ServerWebSocket<T>, event: Event) => void | Promise<void>;
    close?: (ws: ServerWebSocket<T>, event: CloseEvent) => void | Promise<void>;
    error?: (ws: ServerWebSocket<T>, event: Event) => void | Promise<void>;
}

export interface WebSocketOptions {
    idleTimeout?: number;
}

export interface UpgradeOptions<T = any> {
    data?: T;
}

/**
 * A universal WebSocket server that works in Node.js, Deno, Bun and Cloudflare
 * Workers.
 * 
 * @example
 * ```ts
 * const wsServer = new WebSocketServer({
 *     message(ws, event) {
 *         ws.send("received: " + event.data);
 *     },
 *     open(ws, event) {
 *         console.log(`WebSocket connection established.`);
 *     },
 *     close(ws, event) {
 *         console.log("WebSocket connection closed, reason: ${event.reason}, code: ${event.code}");
 *     },
 *     error(ws, event) {
 *         console.error("WebSocket connection error:", event);
 *     },
 * });
 * 
 * // Node.js
 * const httpServer = http.createServer((req, res) => {});
 * httpServer.on("upgrade", (req, socket, head) => {
 *     wsServer.upgrade(req, socket, head);
 * });
 * httpServer.listen(3000);
 * 
 * // Deno
 * Deno.serve(req => {
 *     const { response } = wsServer.upgrade(req);
 *     return response;
 * });
 * 
 * // Bun
 * Bun.serve({
 *     fetch(req) {
 *         const { ok, response } = wsServer.upgrade(req);
 *         if (ok) {
 *             return undefined;
 *         } else {
 *             return response;
 *         }
 *     },
 *     websocket: wsServer.websocket,
 * });
 * 
 * // Cloudflare Workers
 * export default {
 *     fetch(req) {
 *         const { response } = wsServer.upgrade(req);
 *         return response;
 *     },
 * };
 * ```
 */
export interface WebSocketServer<T = any> {
    constructor(listeners: WebSocketServerListeners<T>, options?: WebSocketOptions): WebSocketServer<T>;

    /**
     * Upgrades the request to a WebSocket connection in Deno, Cloudflare
     * Workers and Bun.
     * 
     * In Deno and Cloudflare Workers, the returned `response` object needs to
     * be send back to the client to establish the WebSocket connection. In Bun,
     * the `response` object should not be sent and just return `undefined`.
     */
    upgrade(request: Request, options?: UpgradeOptions): { ok: boolean; response: Response; };
    /**
     * Upgrades the request to a WebSocket connection in Node.js.
     */
    upgrade(
        request: import("http").IncomingMessage,
        socket: import("net").Socket,
        head: Buffer,
        options?: UpgradeOptions
    ): void;

    /**
     * A WebSocket listener for `Bun.serve()`.
     */
    readonly websocket: {
        message: (ws: any, message: any) => void;
        open: (ws: any) => void;
        close: (ws: any, code: number, reason: string) => void;
        error: (ws: any, error: any) => void;
    };
}
