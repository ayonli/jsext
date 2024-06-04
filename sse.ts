/**
 * This module provides tools for working with server-sent events.
 * 
 * The {@link SSE} class is used to handle SSE requests and send messages to the
 * client, while the {@link EventClient} class is used to process messages sent
 * by the server.
 * 
 * NOTE: this module is based on the `Request` and `Response` APIs, in Node.js,
 * it requires version v18.0 or higher.
 * 
 * @module
 * @experimental
 */

const SSEMarkClosed = new Set<string>();
const _lastEventId = Symbol.for("lastEventId");
const _closed = Symbol.for("closed");
const _response = Symbol.for("response");
const _writer = Symbol.for("writer");
const _reader = Symbol.for("reader");
const _reconnectionTime = Symbol.for("reconnectionTime");

const encoder = new TextEncoder();

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
 * // server.ts (Deno)
 * import { SSE } from "@ayonli/jsext/sse";
 * 
 * Deno.serve(async req => {
 *     const sse = new SSE(req);
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
 * 
 *     return sse.response;
 * });
 * ```
 */
export class SSE extends EventTarget {
    private [_writer]: WritableStreamDefaultWriter<Uint8Array>;
    private [_response]: Response | undefined;
    private [_lastEventId]: string;
    private [_reconnectionTime]: number;
    private [_closed]: boolean;

    constructor(request: Request, options: SSEOptions = {}) {
        super();
        this[_lastEventId] = request.headers.get("Last-Event-ID") ?? "";
        this[_reconnectionTime] = options.reconnectionTime ?? 0;
        this[_closed] = this[_lastEventId]
            ? SSEMarkClosed.has(this[_lastEventId])
            : false;

        const _this = this;
        const { writable, readable } = new TransformStream<Uint8Array, Uint8Array>();

        this[_writer] = writable.getWriter();
        const reader = readable.getReader();

        const _readable = new ReadableStream<Uint8Array>({
            async start(controller) {
                controller.enqueue(new Uint8Array(0));
            },
            async pull(controller) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        try {
                            controller.close();
                        } catch {
                            // ignore
                        }
                        break;
                    }

                    controller.enqueue(value);
                }
            },
            async cancel(reason) {
                await reader.cancel(reason);
                _this[_closed] = true;
                _this.dispatchEvent(createCloseEvent({
                    reason: reason instanceof Error ? reason.message : String(reason ?? ""),
                    wasClean: true,
                }));
            }
        });

        this[_response] = new Response(this.closed ? null : _readable, {
            status: this.closed ? 204 : 200,
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });

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
     * The response that will be sent to the client.
     */
    get response(): Response {
        return this[_response]!;
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
        return super.addEventListener(event, listener as EventListenerOrEventListenerObject, options);
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

            return true;
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

        message += data.split(/\r\n|\r/).map((line) => `data: ${line}\n`).join("");
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
    async send(data: string, eventId: string | undefined = undefined): Promise<void> {
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
    async sendEvent(
        event: string,
        data: string,
        eventId: string | undefined = undefined
    ): Promise<void> {
        await this[_writer].write(this.buildMessage(data, { id: eventId, event }));
    }

    /**
     * Closes the connection and instructs the client not to reconnect.
     */
    async close(): Promise<void> {
        if (this.lastEventId) {
            if (!SSEMarkClosed.has(this.lastEventId)) {
                SSEMarkClosed.add(this.lastEventId);
            } else {
                SSEMarkClosed.delete(this.lastEventId);
            }
        }

        await this[_writer].close();
        this[_closed] = true;
        this.dispatchEvent(createCloseEvent({ wasClean: true }));
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
 *   event, and the close event will have the `wasClean` set to `false`.
 * - `message` - Dispatched when a message with the default event type is
 *   received.
 * - custom events - Dispatched when a message with a custom event type is
 *   received.
 * 
 * @example
 * ```ts
 * // client.ts
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
        this.readMessages();
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

    private async readMessages(): Promise<void> {
        const reader = this[_reader];
        const decoder = new TextDecoder();
        let buffer: string = "";

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    this[_closed] = true;
                    this.dispatchEvent(createCloseEvent({ wasClean: true }));
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
                        if (line.startsWith("data:")) {
                            if (data) {
                                data += "\n" + line.slice(6).trim();
                            } else {
                                data = line.slice(6).trim();
                            }
                        } else if (line.startsWith("event:")) {
                            type = line.slice(6).trim();
                        } else if (line.startsWith("id:")) {
                            this[_lastEventId] = line.slice(3).trim();
                        } else if (line.startsWith("retry:")) {
                            const time = parseInt(line.slice(6).trim());
                            if (!isNaN(time) && time >= 0) {
                                this[_reconnectionTime] = time;
                            }
                        }
                    }

                    this.dispatchEvent(new MessageEvent(type, {
                        lastEventId: this[_lastEventId],
                        data,
                    }));
                }
            }
        } catch (error) {
            this[_closed] = true;
            this.dispatchEvent(createErrorEvent({ error }));
            this.dispatchEvent(createCloseEvent({
                reason: error instanceof Error ? error.message : String(error),
                wasClean: false,
            }));
        }
    }

    /**
     * Closes the connection.
     */
    async close(): Promise<void> {
        await this[_reader].cancel();
        this[_closed] = true;
    }

    /**
     * Adds an event listener that will be called when the connection is
     * interrupted, the `error` property of the event contains the cause of the
     * error. After this event is dispatched, the connection will be closed and
     * the `close` event will be dispatched.
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
     * set to `false`.
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
        return super.addEventListener(event, listener as EventListenerOrEventListenerObject, options);
    }
}

function createCloseEvent(options: CloseEventInit = {}) {
    if (typeof CloseEvent === "function") {
        return new CloseEvent("close", options);
    } else {
        const event = new Event("close", {
            bubbles: false,
            cancelable: false,
            composed: false,
        });

        Object.defineProperties(event, {
            code: { value: options.code ?? 0 },
            reason: { value: options.reason ?? "" },
            wasClean: { value: options.wasClean ?? false },
        });

        return event;
    }
}

function createErrorEvent(options: ErrorEventInit = {}) {
    if (typeof ErrorEvent === "function") {
        return new ErrorEvent("error", options);
    } else {
        const event = new Event("error", {
            bubbles: false,
            cancelable: false,
            composed: false,
        });

        Object.defineProperties(event, {
            message: { value: options?.message ?? "" },
            filename: { value: options?.filename ?? "" },
            lineno: { value: options?.lineno ?? 0 },
            colno: { value: options?.colno ?? 0 },
            error: { value: options?.error ?? undefined },
        });

        return event;
    }
}
