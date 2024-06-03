import bytes from './bytes.js';
import { Mutex } from './lock.js';

var _a, _b, _c, _d;
const SSEMarkClosed = new Set();
const _lastEventId = Symbol.for("lastEventId");
const _closed = Symbol.for("closed");
const _response = Symbol.for("response");
const _writer = Symbol.for("writer");
const _reader = Symbol.for("reader");
const _reconnectionTime = Symbol.for("reconnectionTime");
const _mutex = Symbol.for("mutex");
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
        var _e, _f;
        super();
        this[_a] = new Mutex(void 0);
        this[_lastEventId] = (_e = request.headers.get("Last-Event-ID")) !== null && _e !== void 0 ? _e : "";
        this[_reconnectionTime] = (_f = options.reconnectionTime) !== null && _f !== void 0 ? _f : 0;
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
                if (reason) {
                    _this.dispatchEvent(createErrorEvent({ error: reason }));
                }
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
    async _send(data, eventId = undefined) {
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
     * Sends a message to the client.
     *
     * The client (`EventSource` or {@link EventReader}) will receive the
     * message as a `MessageEvent`, which can be listened to using the
     * `message` event.
     *
     * @param eventId If specified, the client will remember the value as the
     * last event ID and will send it back to the server when reconnecting.
     */
    async send(data, eventId = undefined) {
        const lock = await this[_mutex].lock();
        try {
            await this._send(data, eventId);
        }
        finally {
            lock.unlock();
        }
    }
    /**
     * Sends a custom event to the client.
     *
     * The client (`EventSource` or {@link EventReader}) will receive the
     * event as a `MessageEvent`, which can be listened to using the custom
     * event name.
     *
     * @param eventId If specified, the client will remember the value as the
     * last event ID and will send it back to the server when reconnecting.
     */
    async sendEvent(event, data, eventId = undefined) {
        const lock = await this[_mutex].lock();
        try {
            await this[_writer].write(bytes(`event: ${event}\n`));
            await this._send(data, eventId);
        }
        finally {
            lock.unlock();
        }
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
_a = _mutex;
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
class EventReader extends EventTarget {
    constructor(response) {
        var _e;
        super();
        this[_b] = "";
        this[_c] = 0;
        this[_d] = false;
        if (!response.body) {
            throw new TypeError("The response does not have a body.");
        }
        else if (response.bodyUsed) {
            throw new TypeError("The response body has already been used.");
        }
        else if (response.body.locked) {
            throw new TypeError("The response body is locked.");
        }
        else if (!((_e = response.headers.get("Content-Type")) === null || _e === void 0 ? void 0 : _e.startsWith("text/event-stream"))) {
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
_b = _lastEventId, _c = _reconnectionTime, _d = _closed;
function createCloseEvent(options = {}) {
    var _e, _f, _g;
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
            code: { value: (_e = options.code) !== null && _e !== void 0 ? _e : 0 },
            reason: { value: (_f = options.reason) !== null && _f !== void 0 ? _f : "" },
            wasClean: { value: (_g = options.wasClean) !== null && _g !== void 0 ? _g : false },
        });
        return event;
    }
}
function createErrorEvent(options = {}) {
    var _e, _f, _g, _h, _j;
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
            message: { value: (_e = options === null || options === void 0 ? void 0 : options.message) !== null && _e !== void 0 ? _e : "" },
            filename: { value: (_f = options === null || options === void 0 ? void 0 : options.filename) !== null && _f !== void 0 ? _f : "" },
            lineno: { value: (_g = options === null || options === void 0 ? void 0 : options.lineno) !== null && _g !== void 0 ? _g : 0 },
            colno: { value: (_h = options === null || options === void 0 ? void 0 : options.colno) !== null && _h !== void 0 ? _h : 0 },
            error: { value: (_j = options === null || options === void 0 ? void 0 : options.error) !== null && _j !== void 0 ? _j : undefined },
        });
        return event;
    }
}

export { EventReader, SSE };
//# sourceMappingURL=sse.js.map
