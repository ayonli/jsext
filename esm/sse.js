import './external/event-target-polyfill/index.js';
import { createCloseEvent, createErrorEvent } from './event.js';
import { isBun } from './env.js';
import runtime from './runtime.js';

var _a, _b, _c, _d, _e, _f, _g;
if (typeof MessageEvent !== "function" || runtime().identity === "workerd") {
    // Worker environments does not implement or only partially implement the MessageEvent, 
    // we need to implement it ourselves.
    globalThis.MessageEvent = class MessageEvent extends Event {
        constructor(type, eventInitDict) {
            var _h, _j, _k;
            super(type, eventInitDict);
            this.data = undefined;
            this.lastEventId = "";
            this.origin = "";
            this.ports = [];
            this.source = null;
            if (eventInitDict) {
                this.data = eventInitDict.data;
                this.lastEventId = (_h = eventInitDict.lastEventId) !== null && _h !== void 0 ? _h : "";
                this.origin = (_j = eventInitDict.origin) !== null && _j !== void 0 ? _j : "";
                this.ports = (_k = eventInitDict.ports) !== null && _k !== void 0 ? _k : [];
            }
        }
        initMessageEvent(type, bubbles, cancelable, data, origin, lastEventId, source, ports) {
            this.initEvent(type, bubbles !== null && bubbles !== void 0 ? bubbles : false, cancelable !== null && cancelable !== void 0 ? cancelable : false);
            Object.assign(this, { data, origin, lastEventId, source, ports });
        }
    };
}
const SSEMarkClosed = new Set();
const _lastEventId = Symbol.for("lastEventId");
const _closed = Symbol.for("closed");
const _response = Symbol.for("response");
const _writer = Symbol.for("writer");
const _reader = Symbol.for("reader");
const _reconnectionTime = Symbol.for("reconnectionTime");
const _readyState = Symbol.for("readyState");
const encoder = new TextEncoder();
/**
 * An SSE (server-sent events) implementation that can be used to send messages
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
 * import { EventEndpoint } from "@ayonli/jsext/sse";
 *
 * export default {
 *     async fetch(req: Request) {
 *         const events = new EventEndpoint(req);
 *
 *         events.addEventListener("close", (ev) => {
 *             console.log(`The connection is closed, reason: ${ev.reason}`);
 *         });
 *
 *         setTimeout(() => {
 *             events.dispatchEvent(new MessageEvent("my-event", {
 *                 data: "Hello, World!",
 *                 lastEventId: "1",
 *             }));
 *         }, 1_000);
 *
 *         return events.response!;
 *     }
 * }
 * ```
 *
 * @example
 * ```ts
 * // with Node.js APIs
 * import * as http from "node:http";
 * import { EventEndpoint } from "@ayonli/jsext/sse";
 *
 * const server = http.createServer((req, res) => {
 *     const events = new EventEndpoint(req, res);
 *
 *     events.addEventListener("close", (ev) => {
 *         console.log(`The connection is closed, reason: ${ev.reason}`);
 *     });
 *
 *     setTimeout(() => {
 *         events.dispatchEvent(new MessageEvent("my-event", {
 *             data: "Hello, World!",
 *             lastEventId: "1",
 *         }));
 *     }, 1_000);
 * });
 *
 * server.listen(3000);
 * ```
 */
class EventEndpoint extends EventTarget {
    constructor(request, ...args) {
        var _h, _j, _k, _l, _m;
        super();
        const isNodeRequest = "socket" in request && "socket" in args[0];
        let options;
        if (isNodeRequest) {
            const req = request;
            this[_lastEventId] = String((_h = req.headers["last-event-id"]) !== null && _h !== void 0 ? _h : "");
            options = (_j = args[1]) !== null && _j !== void 0 ? _j : {};
        }
        else {
            this[_lastEventId] = (_k = request.headers.get("Last-Event-ID")) !== null && _k !== void 0 ? _k : "";
            options = (_l = args[0]) !== null && _l !== void 0 ? _l : {};
        }
        this[_reconnectionTime] = (_m = options.reconnectionTime) !== null && _m !== void 0 ? _m : 0;
        this[_closed] = this[_lastEventId]
            ? SSEMarkClosed.has(this[_lastEventId])
            : false;
        const resInit = {
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
            const res = args[0];
            const writable = new WritableStream({
                write(chunk) {
                    res.write(chunk);
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
            }).once("error", (err) => {
                this[_writer].abort(err).catch(() => { });
            });
            for (const [name, value] of Object.entries(resInit.headers)) {
                // Use `setHeader` to set headers instead of passing them to `writeHead`,
                // it seems in Deno, the headers are not written to the response if they
                // are passed to `writeHead`.
                res.setHeader(name, value);
            }
            res.writeHead(resInit.status, resInit.statusText);
            res.write(new Uint8Array(0));
        }
        else {
            const { writable, readable } = new TransformStream();
            const reader = readable.getReader();
            const _readable = new ReadableStream({
                async start(controller) {
                    if (isBun) {
                        // In Bun, the response will not be sent to the client
                        // until the first non-empty chunk is written. May be a
                        // bug, but we need to work around it now.
                        controller.enqueue(encoder.encode(":ok\n\n"));
                    }
                    else {
                        controller.enqueue(new Uint8Array(0));
                    }
                },
                async pull(controller) {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            try {
                                controller.close();
                            }
                            catch (_h) { }
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
     * The response that will be sent to the client, only available when the
     * instance is created with the `Request` API.
     */
    get response() {
        return this[_response];
    }
    addEventListener(event, listener, options) {
        return super.addEventListener(event, listener, options);
    }
    dispatchEvent(event) {
        if (event instanceof MessageEvent) {
            if (event.type === "message") {
                this.send(event.data, event.lastEventId).catch(() => { });
            }
            else {
                this.sendEvent(event.type, event.data, event.lastEventId)
                    .catch(() => { });
            }
            return !event.cancelable || !event.defaultPrevented;
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
        message += data.split(/\r\n|\n/).map((line) => `data: ${line}\n`).join("");
        message += "\n";
        return encoder.encode(message);
    }
    /**
     * Sends a message to the client.
     *
     * The client (`EventSource` or {@link EventConsumer}) will receive the
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
     * The client (`EventSource` or {@link EventConsumer}) will receive the
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
    close(noReconnect = false) {
        this[_writer].close().catch(() => { }).finally(() => {
            this[_closed] = true;
            if (this.lastEventId) {
                if (!SSEMarkClosed.has(this.lastEventId)) {
                    noReconnect && SSEMarkClosed.add(this.lastEventId);
                }
                else {
                    SSEMarkClosed.delete(this.lastEventId);
                }
            }
        });
    }
}
/**
 * @deprecated Use {@link EventEndpoint} instead.
 */
const SSE = EventEndpoint;
/**
 * An SSE (server-sent events) client that consumes and processes event messages
 * sent by the server. Unlike the `EventSource` API, which takes a URL and only
 * supports GET request, this implementation accepts a `Response` object and
 * reads the messages from its body, the response can be generated from any type
 * of request, usually returned from the `fetch` function.
 *
 * This API doesn't support reconnection, however, we can add a event listener
 * to the close event and reestablish the connection manually.
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
 * import { EventConsumer } from "@ayonli/jsext/sse";
 *
 * const response = await fetch("http://localhost:3000", {
 *     method: "POST",
 *     headers: {
 *         "Accept": "text/event-stream",
 *     },
 * });
 * const events = new EventConsumer(response);
 *
 * events.addEventListener("close", (ev) => {
 *     console.log(`The connection is closed, reason: ${ev.reason}`);
 *
 *     if (!ev.wasClean) {
 *         // perhaps to reestablish the connection
 *     }
 * });
 *
 * events.addEventListener("my-event", (ev) => {
 *     console.log(`Received message from the server: ${ev.data}`);
 * });
 * ```
 */
class EventConsumer extends EventTarget {
    constructor(response) {
        var _h;
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
        else if (!((_h = response.headers.get("Content-Type")) === null || _h === void 0 ? void 0 : _h.startsWith("text/event-stream"))) {
            throw new TypeError("The response is not an event stream.");
        }
        this[_reader] = response.body.getReader();
        this.readMessages(response.url ? new URL(response.url).origin : "");
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
     * NOTE: The {@link EventConsumer} API does not support auto-reconnection,
     * this value is only used when we want to reestablish the connection
     * manually.
     */
    get retry() {
        return this[_reconnectionTime];
    }
    async readMessages(origin) {
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
                    let isMessage = false;
                    for (const line of lines) {
                        if (line.startsWith("data:") || line === "data") {
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
                            isMessage = true;
                        }
                        else if (line.startsWith("event:") || line === "event") {
                            type = line.slice(6).trim();
                            isMessage = true;
                        }
                        else if (line.startsWith("id:") || line === "id") {
                            this[_lastEventId] = line.slice(3).trim();
                            isMessage = true;
                        }
                        else if (line.startsWith("retry:")) {
                            const time = parseInt(line.slice(6).trim());
                            if (!isNaN(time) && time >= 0) {
                                this[_reconnectionTime] = time;
                                isMessage = true;
                            }
                        }
                    }
                    if (isMessage) {
                        this.dispatchEvent(new MessageEvent(type || "message", {
                            lastEventId: this[_lastEventId],
                            data,
                            origin,
                        }));
                    }
                }
            }
        }
        catch (error) {
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
    close() {
        this[_reader].cancel().catch(() => { });
    }
    addEventListener(event, listener, options) {
        return super.addEventListener(event, listener, options);
    }
}
_a = _lastEventId, _b = _reconnectionTime, _c = _closed;
/**
 * @deprecated Use {@link EventConsumer} instead.
 */
const EventClient = EventConsumer;
/**
 * This is a polyfill for the `EventSource` API, which can be used in
 * environments that do not support the native API, such as Node.js.
 *
 * @example
 * ```ts
 * import { EventSource } from "@ayonli/jsext/sse";
 *
 * const events = new EventSource("http://localhost:3000");
 *
 * events.addEventListener("open", () => {
 *     console.log("The connection is open.");
 * });
 *
 * events.addEventListener("error", (ev) => {
 *     console.error("An error occurred:", ev.error);
 * });
 *
 * events.addEventListener("message", (ev) => {
 *     console.log("Received message from the server:", ev.data);
 * });
 *
 * events.addEventListener("my-event", (ev) => {
 *     console.log("Received custom event from the server:", ev.data);
 * });
 * ```
 */
class EventSource extends EventTarget {
    constructor(url, options = {}) {
        var _h;
        super();
        this[_d] = null;
        this[_e] = "";
        this[_f] = 0;
        this[_g] = EventSource.CONNECTING;
        this.CONNECTING = EventSource.CONNECTING;
        this.OPEN = EventSource.OPEN;
        this.CLOSED = EventSource.CLOSED;
        this.onerror = null;
        this.onmessage = null;
        this.onopen = null;
        this.url = new URL(url, typeof location === "object" ? location.origin : "").href;
        this.withCredentials = (_h = options === null || options === void 0 ? void 0 : options.withCredentials) !== null && _h !== void 0 ? _h : false;
        this.connect().catch(() => { });
    }
    async connect() {
        var _h, _j, _k, _l, _m, _o;
        if (this[_readyState] === this.CLOSED) {
            return;
        }
        this[_readyState] = this.CONNECTING;
        const headers = new Headers([["Accept", "text/event-stream"]]);
        if (this[_lastEventId]) {
            headers.set("Last-Event-ID", this[_lastEventId]);
        }
        new Request(this.url, {});
        const res = await fetch(this.url, {
            headers,
            mode: this.withCredentials ? "cors" : "same-origin",
            cache: "no-cache",
        });
        if (res.type === "error") {
            if (this[_readyState] !== this.CLOSED) {
                this[_readyState] = this.CLOSED;
                const event = createErrorEvent("error", {
                    error: new Error("The request failed."),
                });
                (_h = this.onerror) === null || _h === void 0 ? void 0 : _h.call(this, event);
                this.dispatchEvent(event);
            }
            else {
                setTimeout(() => {
                    this.connect().catch(() => { });
                }, this[_reconnectionTime]);
            }
            return;
        }
        else if (res.status === 204) {
            this[_readyState] = this.CLOSED;
            return;
        }
        else if (res.status !== 200) {
            this[_readyState] = this.CLOSED;
            const event = createErrorEvent("error", {
                error: new Error(`The server responded with status ${res.status}.`),
            });
            (_j = this.onerror) === null || _j === void 0 ? void 0 : _j.call(this, event);
            this.dispatchEvent(event);
            return;
        }
        else if (!((_k = res.headers.get("Content-Type")) === null || _k === void 0 ? void 0 : _k.startsWith("text/event-stream"))) {
            const event = createErrorEvent("error", {
                error: new Error("The response is not an event stream."),
            });
            (_l = this.onerror) === null || _l === void 0 ? void 0 : _l.call(this, event);
            this.dispatchEvent(event);
            return;
        }
        else if (!res.body) {
            const event = createErrorEvent("error", {
                error: new Error("The response does not have a body."),
            });
            (_m = this.onerror) === null || _m === void 0 ? void 0 : _m.call(this, event);
            this.dispatchEvent(event);
            return;
        }
        this[_readyState] = this.OPEN;
        this[_reader] = res.body.getReader();
        const event = new Event("open");
        (_o = this.onopen) === null || _o === void 0 ? void 0 : _o.call(this, event);
        this.dispatchEvent(event);
        this.readMessages(new URL(res.url || this.url).origin);
    }
    async readMessages(origin) {
        var _h, _j, _k;
        const reader = this[_reader];
        const decoder = new TextDecoder();
        let buffer = "";
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    if (this[_readyState] !== this.CLOSED) {
                        const event = createErrorEvent("error", {
                            error: new Error("The connection is closed."),
                        });
                        (_h = this.onerror) === null || _h === void 0 ? void 0 : _h.call(this, event);
                        this.dispatchEvent(event);
                        setTimeout(() => {
                            this.connect().catch(() => { });
                        }, this[_reconnectionTime]);
                    }
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
                    let isMessage = false;
                    for (const line of lines) {
                        if (line.startsWith("data:") || line === "data") {
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
                            isMessage = true;
                        }
                        else if (line.startsWith("event:") || line === "event") {
                            type = line.slice(6).trim();
                            isMessage = true;
                        }
                        else if (line.startsWith("id:") || line === "id") {
                            this[_lastEventId] = line.slice(3).trim();
                            isMessage = true;
                        }
                        else if (line.startsWith("retry:")) {
                            const time = parseInt(line.slice(6).trim());
                            if (!isNaN(time) && time >= 0) {
                                this[_reconnectionTime] = time;
                                isMessage = true;
                            }
                        }
                    }
                    if (isMessage) {
                        const event = new MessageEvent(type || "message", {
                            lastEventId: this[_lastEventId],
                            data,
                            origin,
                        });
                        (_j = this.onmessage) === null || _j === void 0 ? void 0 : _j.call(this, event);
                        this.dispatchEvent(event);
                    }
                }
            }
        }
        catch (error) {
            if (this[_readyState] !== this.CLOSED) {
                const event = createErrorEvent("error", { error });
                (_k = this.onerror) === null || _k === void 0 ? void 0 : _k.call(this, event);
                this.dispatchEvent(event);
            }
        }
    }
    get readyState() {
        return this[_readyState];
    }
    close() {
        var _h;
        this[_readyState] = this.CLOSED;
        (_h = this[_reader]) === null || _h === void 0 ? void 0 : _h.cancel().catch(() => { });
    }
    addEventListener(event, listener, options) {
        return super.addEventListener(event, listener, options);
    }
}
_d = _reader, _e = _lastEventId, _f = _reconnectionTime, _g = _readyState;
EventSource.CONNECTING = 0;
EventSource.OPEN = 1;
EventSource.CLOSED = 2;

export { EventClient, EventConsumer, EventEndpoint, EventSource, SSE };
//# sourceMappingURL=sse.js.map
