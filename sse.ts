/**
 * This module provides tools for working with server-sent events.
 * 
 * The {@link SSE} class is used to handle SSE requests and send messages to the
 * client, while the {@link EventClient} class is used to process messages sent
 * by the server.
 * 
 * NOTE: This module depends on the Web Streams API, in Node.js, it requires
 * Node.js v16.5 or higher.
 * 
 * @module
 * @experimental
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import type { Http2ServerRequest, Http2ServerResponse } from "node:http2";
import { createCloseEvent, createErrorEvent } from "./event.ts";

const SSEMarkClosed = new Set<string>();
const _lastEventId = Symbol.for("lastEventId");
const _closed = Symbol.for("closed");
const _response = Symbol.for("response");
const _writer = Symbol.for("writer");
const _reader = Symbol.for("reader");
const _reconnectionTime = Symbol.for("reconnectionTime");

const encoder = new TextEncoder();

/**
 * The options for the {@link SSE} constructor.
 */
export interface SSEOptions {
    /**
     * The time in milliseconds that instructs the client to wait before
     * reconnecting.
     */
    reconnectionTime?: number;
}

/**
 * A server-sent events (SSE) implementation that can be used to send messages
 * to the client. This implementation is based on the `EventTarget` interface
 * and conforms the web standard.
 * 
 * **Events:**
 * 
 * - `close` - Dispatched when the connection is closed.
 * 
 * @example
 * ```ts
 * // with Web APIs
 * import { SSE } from "@ayonli/jsext/sse";
 * 
 * export default {
 *     async fetch(req: Request) {
 *         const sse = new SSE(req);
 * 
 *         sse.addEventListener("close", (ev) => {
 *             console.log(`The connection is closed, reason: ${ev.reason}`);
 *         });
 * 
 *         setTimeout(() => {
 *             sse.dispatchEvent(new MessageEvent("my-event", {
 *                 data: "Hello, World!",
 *                 lastEventId: "1",
 *             }));
 *         }, 1_000);
 * 
 *         return sse.response;
 *     }
 * }
 * ```
 * 
 * @example
 * ```ts
 * // with Node.js APIs
 * import * as http from "node:http";
 * import { SSE } from "@ayonli/jsext/sse";
 * 
 * const server = http.createServer((req, res) => {
 *     const sse = new SSE(req, res);
 * 
 *     sse.addEventListener("close", (ev) => {
 *         console.log(`The connection is closed, reason: ${ev.reason}`);
 *     });
 * 
 *     setTimeout(() => {
 *         sse.dispatchEvent(new MessageEvent("my-event", {
 *             data: "Hello, World!",
 *             lastEventId: "1",
 *         }));
 *     }, 1_000);
 * });
 * 
 * server.listen(3000);
 * ```
 */
export class SSE extends EventTarget {
    private [_writer]: WritableStreamDefaultWriter<Uint8Array>;
    private [_response]: Response | null;
    private [_lastEventId]: string;
    private [_reconnectionTime]: number;
    private [_closed]: boolean;

    constructor(request: Request, options?: SSEOptions);
    constructor(
        request: IncomingMessage | Http2ServerRequest,
        response: ServerResponse | Http2ServerResponse,
        options?: SSEOptions
    );
    constructor(
        request: Request | IncomingMessage | Http2ServerRequest,
        ...args: any[]
    ) {
        super();

        const isNodeRequest = "socket" in request && "socket" in args[0];
        let options: SSEOptions;

        if (isNodeRequest) {
            const req = request as IncomingMessage | Http2ServerRequest;
            this[_lastEventId] = String(req.headers["last-event-id"] ?? "");
            options = args[1] ?? {};
        } else {
            this[_lastEventId] = (request as Request).headers.get("Last-Event-ID") ?? "";
            options = args[0] ?? {};
        }

        this[_reconnectionTime] = options.reconnectionTime ?? 0;
        this[_closed] = this[_lastEventId]
            ? SSEMarkClosed.has(this[_lastEventId])
            : false;
        const resInit: ResponseInit = {
            status: this.closed ? 204 : 200,
            statusText: this.closed ? "No Content" : "OK",
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Transfer-Encoding": "chunked",
            },
        };

        const _this = this;

        if (isNodeRequest) {
            this[_response] = null;
            const res = args[0] as ServerResponse | Http2ServerResponse;
            const writable = new WritableStream({
                write(chunk) {
                    (res as ServerResponse).write(chunk);
                },
                close() {
                    _this[_closed] = true;
                    res.closed || res.end();
                    _this.dispatchEvent(createCloseEvent("close", { wasClean: true }));
                },
                abort(err) {
                    _this[_closed] = true;
                    res.closed || res.destroy(err);
                },
            });

            this[_writer] = writable.getWriter();
            res.once("close", () => {
                this[_writer].close().catch(() => { });
            }).once("error", (error) => {
                this[_writer].abort(error).catch(() => { });
            });

            for (const [name, value] of Object.entries(resInit.headers!)) {
                // Use `setHeader` to set headers instead of passing them to `writeHead`,
                // it seems in Deno, the headers are not written to the response if they
                // are passed to `writeHead`.
                res.setHeader(name, value);
            }

            res.writeHead(resInit.status!, resInit.statusText!);
            (res as ServerResponse).write(new Uint8Array(0));
        } else {
            const { writable, readable } = new TransformStream<Uint8Array, Uint8Array>();
            const reader = readable.getReader();

            const _readable = new ReadableStream<Uint8Array>({
                async start(controller) {
                    controller.enqueue(new Uint8Array(0));
                },
                async pull(controller) {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            try { controller.close(); } catch { }
                            _this.dispatchEvent(createCloseEvent("close", { wasClean: true }));
                            break;
                        }

                        controller.enqueue(value);
                    }
                },
                async cancel(reason) {
                    _this[_closed] = true;
                    await reader.cancel(reason);
                }
            });

            this[_writer] = writable.getWriter();
            this[_response] = new Response(this.closed ? null : _readable, resInit);
        }

        this.closed && this.close();
    }

    /**
     * The last event ID that the server has sent.
     */
    get lastEventId(): string {
        return this[_lastEventId];
    }

    /**
     * Indicates whether the connection has been closed.
     */
    get closed(): boolean {
        return this[_closed];
    }

    /**
     * The response that will be sent to the client, only available when the
     * instance is created with the `Request` API.
     */
    get response(): Response | null {
        return this[_response];
    }

    /**
     * Adds an event listener that will be called when the connection is closed.
     * This event will be dispatched after the `error` event.
     */
    override addEventListener(
        type: "close",
        listener: (this: SSE, ev: CloseEvent) => void,
        options?: boolean | AddEventListenerOptions
    ): void;
    override addEventListener(
        type: string,
        listener: (this: SSE, event: Event) => any,
        options?: boolean | AddEventListenerOptions
    ): void;
    override addEventListener(
        event: string,
        listener: any,
        options?: boolean | AddEventListenerOptions
    ): void {
        return super.addEventListener(
            event,
            listener as EventListenerOrEventListenerObject,
            options
        );
    }

    /**
     * Dispatches an message event that will be sent to the client.
     */
    override dispatchEvent(event: MessageEvent<string>): boolean;
    override dispatchEvent(event: CloseEvent | ErrorEvent | Event): boolean;
    override dispatchEvent(event: MessageEvent | CloseEvent | ErrorEvent | Event): boolean {
        if (event instanceof MessageEvent) {
            const _event = event as MessageEvent;

            if (event.type === "message") {
                this.send(_event.data, _event.lastEventId).catch(() => { });
            } else {
                this.sendEvent(_event.type, _event.data, _event.lastEventId)
                    .catch(() => { });
            }

            return !event.cancelable || !event.defaultPrevented;
        } else {
            return super.dispatchEvent(event);
        }
    }

    private buildMessage(data: string, options: {
        id?: string | undefined;
        event?: string | undefined;
    } = {}): Uint8Array {
        let message = "";

        if (options.id) {
            this[_lastEventId] = options.id;
            message += `id: ${options.id}\n`;
        }

        if (options.event) {
            message += `event: ${options.event}\n`;
        }

        if (this[_reconnectionTime]) {
            message += `retry: ${this[_reconnectionTime]}\n`;
        }

        message += data.split(/\r\n|\n/).map((line) => `data: ${line}\n`).join("");
        message += "\n";

        return encoder.encode(message);
    }

    /**
     * Sends a message to the client.
     * 
     * The client (`EventSource` or {@link EventClient}) will receive the
     * message as a `MessageEvent`, which can be listened to using the
     * `message` event.
     * 
     * @param eventId If specified, the client will remember the value as the
     * last event ID and will send it back to the server when reconnecting.
     */
    private async send(data: string, eventId: string | undefined = undefined): Promise<void> {
        await this[_writer].write(this.buildMessage(data, { id: eventId }));
    }

    /**
     * Sends a custom event to the client.
     * 
     * The client (`EventSource` or {@link EventClient}) will receive the
     * event as a `MessageEvent`, which can be listened to using the custom
     * event name.
     * 
     * @param eventId If specified, the client will remember the value as the
     * last event ID and will send it back to the server when reconnecting.
     */
    private async sendEvent(
        event: string,
        data: string,
        eventId: string | undefined = undefined
    ): Promise<void> {
        await this[_writer].write(this.buildMessage(data, { id: eventId, event }));
    }

    /**
     * Closes the connection.
     * 
     * By default, when the connection is closed, the client will try to
     * reconnect after a certain period of time, which is specified by the
     * `reconnectionTime` option when creating the instance.
     * 
     * However, if the `noReconnect` parameter is set, this method will mark
     * the client as closed based on the last event ID. When the client
     * reconnects, the server will send a `204 No Content` response to the
     * client to instruct it to terminate the connection.
     * 
     * It is important to note that the server relies on the last event ID to
     * identify the client for this purpose, so the server must send a globally
     * unique `lastEventId` to the client when sending messages.
     */
    close(noReconnect = false): void {
        this[_writer].close().catch(() => { }).finally(() => {
            this[_closed] = true;

            if (this.lastEventId) {
                if (!SSEMarkClosed.has(this.lastEventId)) {
                    noReconnect && SSEMarkClosed.add(this.lastEventId);
                } else {
                    SSEMarkClosed.delete(this.lastEventId);
                }
            }
        });
    }
}

/**
 * An SSE (server-sent events) client that consumes event messages sent by the
 * server. Unlike the `EventSource` API, which takes a URL and only supports
 * GET request, this implementation accepts a `Response` object and reads the
 * messages from its body, the response can be generated from any type of
 * request, usually returned from the `fetch` function.
 * 
 * This client doesn't support reconnection, however, we can add a event
 * listener to the close event and re-create the client manually.
 * 
 * **Events:**
 * 
 * - `error` - Dispatched when an error occurs, such as network failure. After
 *   this event is dispatched, the connection will be closed and the `close`
 *   event will be dispatched.
 * - `close` - Dispatched when the connection is closed. If the connection is
 *   closed due to some error, the `error` event will be dispatched before this
 *   event, and the close event will have the `wasClean` set to `false`, and the
 *   `reason` property contains the error message, if any.
 * - `message` - Dispatched when a message with the default event type is
 *   received.
 * - custom events - Dispatched when a message with a custom event type is
 *   received.
 * 
 * @example
 * ```ts
 * import { EventClient } from "@ayonli/jsext/sse";
 * 
 * const response = await fetch("http://localhost:3000", {
 *     method: "POST",
 *     headers: {
 *         "Accept": "text/event-stream",
 *     },
 * });
 * const client = new EventClient(response);
 * 
 * client.addEventListener("close", (ev) => {
 *     console.log(`The connection is closed, reason: ${ev.reason}`);
 * 
 *     if (!ev.wasClean) {
 *         // perhaps to re-create the client
 *     }
 * });
 * 
 * client.addEventListener("my-event", (ev) => {
 *     console.log(`Received message from the server: ${ev.data}`);
 * });
 * ```
 */
export class EventClient extends EventTarget {
    private [_reader]: ReadableStreamDefaultReader<Uint8Array>;
    private [_lastEventId]: string = "";
    private [_reconnectionTime]: number = 0;
    private [_closed] = false;

    constructor(response: Response) {
        super();

        if (!response.body) {
            throw new TypeError("The response does not have a body.");
        } else if (response.bodyUsed) {
            throw new TypeError("The response body has already been used.");
        } else if (response.body.locked) {
            throw new TypeError("The response body is locked.");
        } else if (!response.headers.get("Content-Type")?.startsWith("text/event-stream")) {
            throw new TypeError("The response is not an event stream.");
        }

        this[_reader] = response.body.getReader();
        this.readMessages(response.url ? new URL(response.url).origin : "");
    }

    /**
     * The last event ID that the server has sent.
     */
    get lastEventId(): string {
        return this[_lastEventId];
    }

    /**
     * Indicates whether the connection has been closed.
     */
    get closed(): boolean {
        return this[_closed];
    }

    /**
     * The time in milliseconds that instructs the client to wait before
     * reconnecting.
     * 
     * NOTE: the client doesn't support reconnection, this value is only used
     * when we want to re-create the client manually.
     */
    get retry(): number {
        return this[_reconnectionTime];
    }

    private async readMessages(origin: string): Promise<void> {
        const reader = this[_reader];
        const decoder = new TextDecoder();
        let buffer: string = "";

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    this[_closed] = true;
                    this.dispatchEvent(createCloseEvent("close", { wasClean: true }));
                    break;
                }

                buffer += decoder.decode(value);

                const chunks = buffer.split(/\r\n\r\n|\n\n/);

                if (chunks.length === 1) {
                    continue;
                } else {
                    buffer = chunks.pop()!;
                }

                for (const chunk of chunks) {
                    const lines = chunk.split(/\r\n|\n/);
                    let data = "";
                    let type = "message";

                    for (const line of lines) {
                        if (line.startsWith("data:") || line === "data") {
                            let value = line.slice(5);

                            if (value[0] === " ") {
                                value = value.slice(1);
                            }

                            if (data) {
                                data += "\n" + value;
                            } else {
                                data = value;
                            }
                        } else if (line.startsWith("event:") || line === "event") {
                            type = line.slice(6).trim();
                        } else if (line.startsWith("id:") || line === "id") {
                            this[_lastEventId] = line.slice(3).trim();
                        } else if (line.startsWith("retry:")) {
                            const time = parseInt(line.slice(6).trim());
                            if (!isNaN(time) && time >= 0) {
                                this[_reconnectionTime] = time;
                            }
                        }
                    }

                    this.dispatchEvent(new MessageEvent(type || "message", {
                        lastEventId: this[_lastEventId],
                        data,
                        origin,
                    }));
                }
            }
        } catch (error) {
            this[_closed] = true;
            this.dispatchEvent(createErrorEvent("error", { error }));
            this.dispatchEvent(createCloseEvent("close", {
                reason: error instanceof Error ? error.message : String(error),
                wasClean: false,
            }));
        }
    }

    /**
     * Closes the connection.
     */
    close(): void {
        this[_reader].cancel().catch(() => { });
    }

    /**
     * Adds an event listener that will be called when the connection is
     * interrupted. After this event is dispatched, the connection will be
     * closed and the `close` event will be dispatched.
     */
    override addEventListener(
        type: "error",
        listener: (this: EventClient, ev: ErrorEvent) => void,
        options?: boolean | AddEventListenerOptions
    ): void;
    /**
     * Adds an event listener that will be called when the connection is closed.
     * If the connection is closed due to some error, the `error` event will be
     * dispatched before this event, and the close event will have the `wasClean`
     * set to `false`, and the `reason` property contains the error message, if
     * any.
     */
    override addEventListener(
        type: "close",
        listener: (this: EventClient, ev: CloseEvent) => void,
        options?: boolean | AddEventListenerOptions
    ): void;
    /**
     * Adds an event listener that will be called when a message with the
     * default event type is received.
     */
    override addEventListener(
        type: "message",
        listener: (this: EventClient, ev: MessageEvent<string>) => void,
        options?: boolean | AddEventListenerOptions
    ): void;
    /**
     * Adds an event listener that will be called when a message with a custom
     * event type is received.
     */
    override addEventListener(
        type: string,
        listener: (this: EventClient, event: MessageEvent<string>) => void,
        options?: boolean | AddEventListenerOptions
    ): void;
    override addEventListener(
        type: string,
        listener: (this: EventClient, event: Event) => any,
        options?: boolean | AddEventListenerOptions
    ): void;
    override addEventListener(
        event: string,
        listener: any,
        options?: boolean | AddEventListenerOptions
    ): void {
        return super.addEventListener(
            event,
            listener as EventListenerOrEventListenerObject,
            options
        );
    }
}
