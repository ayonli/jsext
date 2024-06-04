import { createCloseEvent } from './error.js';

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
var _a, _b, _c;
const SSEMarkClosed = new Set();
const _lastEventId = Symbol.for("lastEventId");
const _closed = Symbol.for("closed");
const _response = Symbol.for("response");
const _writer = Symbol.for("writer");
const _reader = Symbol.for("reader");
const _reconnectionTime = Symbol.for("reconnectionTime");
const encoder = new TextEncoder();
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
class SSE extends EventTarget {
    constructor(request, options = {}) {
        var _d, _e;
        super();
        this[_lastEventId] = (_d = request.headers.get("Last-Event-ID")) !== null && _d !== void 0 ? _d : "";
        this[_reconnectionTime] = (_e = options.reconnectionTime) !== null && _e !== void 0 ? _e : 0;
        this[_closed] = this[_lastEventId]
            ? SSEMarkClosed.has(this[_lastEventId])
            : false;
        const _this = this;
        const { writable, readable } = new TransformStream();
        this[_writer] = writable.getWriter();
        const reader = readable.getReader();
        const _readable = new ReadableStream({
            async start(controller) {
                controller.enqueue(new Uint8Array(0));
            },
            async pull(controller) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        try {
                            controller.close();
                        }
                        catch (_d) { }
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
    get lastEventId() {
        return this[_lastEventId];
    }
    /**
     * Indicates whether the connection has been closed.
     */
    get closed() {
        return this[_closed];
    }
    /**
     * The response that will be sent to the client.
     */
    get response() {
        return this[_response];
    }
    addEventListener(event, listener, options) {
        return super.addEventListener(event, listener, options);
    }
    dispatchEvent(event) {
        if (event instanceof MessageEvent) {
            const _event = event;
            if (event.type === "message") {
                this.send(_event.data, _event.lastEventId).catch(() => { });
            }
            else {
                this.sendEvent(_event.type, _event.data, _event.lastEventId)
                    .catch(() => { });
            }
            return true;
        }
        else {
            return super.dispatchEvent(event);
        }
    }
    buildMessage(data, options = {}) {
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
    async send(data, eventId = undefined) {
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
    async sendEvent(event, data, eventId = undefined) {
        await this[_writer].write(this.buildMessage(data, { id: eventId, event }));
    }
    /**
     * Closes the connection and instructs the client not to reconnect.
     */
    close() {
        this[_writer].close().catch(() => { }).finally(() => {
            this[_closed] = true;
            if (this.lastEventId) {
                if (!SSEMarkClosed.has(this.lastEventId)) {
                    SSEMarkClosed.add(this.lastEventId);
                }
                else {
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
class EventClient extends EventTarget {
    constructor(response) {
        var _d;
        super();
        this[_a] = "";
        this[_b] = 0;
        this[_c] = false;
        if (!response.body) {
            throw new TypeError("The response does not have a body.");
        }
        else if (response.bodyUsed) {
            throw new TypeError("The response body has already been used.");
        }
        else if (response.body.locked) {
            throw new TypeError("The response body is locked.");
        }
        else if (!((_d = response.headers.get("Content-Type")) === null || _d === void 0 ? void 0 : _d.startsWith("text/event-stream"))) {
            throw new TypeError("The response is not an event stream.");
        }
        this[_reader] = response.body.getReader();
        this.readMessages();
    }
    /**
     * The last event ID that the server has sent.
     */
    get lastEventId() {
        return this[_lastEventId];
    }
    /**
     * Indicates whether the connection has been closed.
     */
    get closed() {
        return this[_closed];
    }
    /**
     * The time in milliseconds that instructs the client to wait before
     * reconnecting.
     *
     * NOTE: the client doesn't support reconnection, this value is only used
     * when we want to re-create the client manually.
     */
    get retry() {
        return this[_reconnectionTime];
    }
    async readMessages() {
        const reader = this[_reader];
        const decoder = new TextDecoder();
        let buffer = "";
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
                }
                else {
                    buffer = chunks.pop();
                }
                for (const chunk of chunks) {
                    const lines = chunk.split(/\r\n|\n/);
                    let data = "";
                    let type = "message";
                    for (const line of lines) {
                        if (line.startsWith("data:")) {
                            let value = line.slice(5);
                            if (value[0] === " ") {
                                value = value.slice(1);
                            }
                            if (data) {
                                data += "\n" + value;
                            }
                            else {
                                data = value;
                            }
                        }
                        else if (line.startsWith("event:")) {
                            type = line.slice(6).trim();
                        }
                        else if (line.startsWith("id:")) {
                            this[_lastEventId] = line.slice(3).trim();
                        }
                        else if (line.startsWith("retry:")) {
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
        }
        catch (error) {
            this[_closed] = true;
            this.dispatchEvent(new Event("error"));
            this.dispatchEvent(createCloseEvent("close", {
                reason: error instanceof Error ? error.message : String(error),
                wasClean: false,
            }));
        }
    }
    /**
     * Closes the connection.
     */
    close() {
        this[_reader].cancel().catch(() => { });
    }
    addEventListener(event, listener, options) {
        return super.addEventListener(event, listener, options);
    }
}
_a = _lastEventId, _b = _reconnectionTime, _c = _closed;

export { EventClient, SSE };
//# sourceMappingURL=sse.js.map
