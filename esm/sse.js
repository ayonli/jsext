import bytes from './bytes.js';

var _a;
const SSEMarkClosed = new Set();
const _lastEventId = Symbol.for("lastEventId");
const _closed = Symbol.for("closed");
const _response = Symbol.for("response");
const _writer = Symbol.for("writer");
const _reader = Symbol.for("reader");
const _reconnectionTime = Symbol.for("reconnectionTime");
/**
 * A server-sent events (SSE) implementation that can be used to send messages
 * to the client. This implementation is based on the `EventTarget` interface
 * and conforms the web standard.
 *
 * @example
 * ```ts
 * // server.ts (Deno)
 * import { SSE } from "@ayonli/jsext/sse";
 *
 * Deno.serve(async req => {
 *     const sse = new SSE(req);
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
        var _b, _c;
        super();
        this[_lastEventId] = (_b = request.headers.get("Last-Event-ID")) !== null && _b !== void 0 ? _b : "";
        this[_reconnectionTime] = (_c = options.reconnectionTime) !== null && _c !== void 0 ? _c : 0;
        this[_closed] = this[_lastEventId]
            ? SSEMarkClosed.has(this[_lastEventId])
            : false;
        const _this = this;
        const { writable, readable } = new TransformStream();
        this[_writer] = writable.getWriter();
        const reader = readable.getReader();
        const _readable = new ReadableStream({
            async start(controller) {
                controller.enqueue(bytes(""));
            },
            async pull(controller) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        controller.close();
                        break;
                    }
                    controller.enqueue(value);
                }
            },
            async cancel(reason) {
                await reader.cancel(reason);
                _this[_closed] = true;
                _this.dispatchEvent(createCloseEvent());
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
     * The time in milliseconds that instructs the client to wait before
     * reconnecting.
     */
    get retry() {
        return this[_reconnectionTime];
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
    /**
     * Sends a message to the client.
     *
     * The client (`EventSource` or {@link EventsReader}) will receive the
     * message as a `MessageEvent`, which can be listened to using the
     * `message` event.
     *
     * @param eventId If specified, the client will remember the value as the
     * last event ID and will send it back to the server when reconnecting.
     */
    async send(data, eventId = undefined) {
        const frames = data.split(/\r\n|\r/);
        this[_lastEventId] = eventId !== null && eventId !== void 0 ? eventId : "";
        const writer = this[_writer];
        if (eventId) {
            await writer.write(bytes(`id: ${eventId}\n`));
        }
        if (this[_reconnectionTime]) {
            await writer.write(bytes(`retry: ${this[_reconnectionTime]}\n`));
        }
        for (const frame of frames) {
            await writer.write(bytes(`data: ${frame}\n`));
        }
        await writer.write(bytes("\n"));
    }
    /**
     * Sends a custom event to the client.
     *
     * The client (`EventSource` or {@link EventsReader}) will receive the
     * event as a `MessageEvent`, which can be listened to using the custom
     * event name.
     *
     * @param eventId If specified, the client will remember the value as the
     * last event ID and will send it back to the server when reconnecting.
     */
    async sendEvent(event, data, eventId = undefined) {
        await this[_writer].write(bytes(`event: ${event}\n`));
        return this.send(data, eventId);
    }
    /**
     * Closes the connection and instructs the client not to reconnect.
     */
    async close() {
        if (this.lastEventId) {
            if (!SSEMarkClosed.has(this.lastEventId)) {
                SSEMarkClosed.add(this.lastEventId);
            }
            else {
                SSEMarkClosed.delete(this.lastEventId);
            }
        }
        await this[_writer].close();
        this[_closed] = true;
        this.dispatchEvent(createCloseEvent());
    }
}
/**
 * An SSE (server-sent events) client that reads messages from the server
 * response. Unlike the `EventSource` API, which takes a URL and only supports
 * GET request, this implementation accepts a `Response` object and reads the
 * messages from its body, the response can be generated from any type of
 * request, usually returned from the `fetch` function.
 *
 * This client doesn't support reconnection, however, we can add a event
 * listener to the close event and re-create the client manually.
 *
 * @example
 * ```ts
 * // client.ts
 * import { EventsReader } from "@ayonli/jsext/sse";
 *
 * const response = await fetch("http://localhost:3000", {
 *     method: "POST",
 *     headers: {
 *         "Accept": "text/event-stream",
 *     },
 * });
 * const reader = new EventsReader(response);
 *
 * reader.addEventListener("my-event", (ev) => {
 *     console.log(ev.data); // "Hello, World!"
 * });
 * ```
 */
class EventsReader extends EventTarget {
    constructor(response) {
        var _b;
        super();
        this[_a] = false;
        if (!response.body) {
            throw new TypeError("The response does not have a body.");
        }
        else if (response.bodyUsed) {
            throw new TypeError("The response body has already been used.");
        }
        else if (response.body.locked) {
            throw new TypeError("The response body is locked.");
        }
        else if (!((_b = response.headers.get("Content-Type")) === null || _b === void 0 ? void 0 : _b.startsWith("text/event-stream"))) {
            throw new TypeError("The response is not an event stream.");
        }
        this[_reader] = response.body.getReader();
        this.read();
    }
    get retry() {
        return this[_reconnectionTime];
    }
    get lastEventId() {
        return this[_lastEventId];
    }
    get closed() {
        return this[_closed];
    }
    async read() {
        var _b;
        const reader = this[_reader];
        const decoder = new TextDecoder();
        let buffer = "";
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    this[_closed] = true;
                    this.dispatchEvent(createCloseEvent());
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
                            if (data) {
                                data += "\n" + line.slice(6).trim();
                            }
                            else {
                                data = line.slice(6).trim();
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
                            if (!isNaN(time)) {
                                this[_reconnectionTime] = time;
                            }
                        }
                    }
                    this.dispatchEvent(new MessageEvent(type, {
                        lastEventId: (_b = this[_lastEventId]) !== null && _b !== void 0 ? _b : "",
                        data,
                    }));
                }
            }
        }
        catch (error) {
            this[_closed] = true;
            this.dispatchEvent(createErrorEvent({ error }));
            this.dispatchEvent(createCloseEvent());
        }
    }
    async close() {
        await this[_reader].cancel();
        this[_closed] = true;
    }
    addEventListener(event, listener, options) {
        return super.addEventListener(event, listener, options);
    }
}
_a = _closed;
function createCloseEvent(options = {}) {
    var _b, _c, _d;
    if (typeof CloseEvent === "function") {
        return new CloseEvent("close", options);
    }
    else {
        const event = new Event("close", {
            bubbles: false,
            cancelable: false,
            composed: false,
        });
        Object.defineProperties(event, {
            code: { value: (_b = options.code) !== null && _b !== void 0 ? _b : 0 },
            reason: { value: (_c = options.reason) !== null && _c !== void 0 ? _c : "" },
            wasClean: { value: (_d = options.wasClean) !== null && _d !== void 0 ? _d : false },
        });
        return event;
    }
}
function createErrorEvent(options = {}) {
    var _b, _c, _d, _e, _f;
    if (typeof ErrorEvent === "function") {
        return new ErrorEvent("error", options);
    }
    else {
        const event = new Event("error", {
            bubbles: false,
            cancelable: false,
            composed: false,
        });
        Object.defineProperties(event, {
            message: { value: (_b = options === null || options === void 0 ? void 0 : options.message) !== null && _b !== void 0 ? _b : "" },
            filename: { value: (_c = options === null || options === void 0 ? void 0 : options.filename) !== null && _c !== void 0 ? _c : "" },
            lineno: { value: (_d = options === null || options === void 0 ? void 0 : options.lineno) !== null && _d !== void 0 ? _d : 0 },
            colno: { value: (_e = options === null || options === void 0 ? void 0 : options.colno) !== null && _e !== void 0 ? _e : 0 },
            error: { value: (_f = options === null || options === void 0 ? void 0 : options.error) !== null && _f !== void 0 ? _f : undefined },
        });
        return event;
    }
}

export { EventsReader, SSE };
//# sourceMappingURL=sse.js.map
