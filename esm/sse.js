import './external/event-target-polyfill/index.js';
import { createCloseEvent, createErrorEvent } from './event.js';
import { isBun, isDeno } from './env.js';
import runtime, { customInspect } from './runtime.js';
import _try from './try.js';

var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
if (typeof MessageEvent !== "function" || runtime().identity === "workerd") {
    // Worker environments does not implement or only partially implement the MessageEvent, 
    // we need to implement it ourselves.
    globalThis.MessageEvent = class MessageEvent extends Event {
        constructor(type, eventInitDict) {
            var _p, _q, _r;
            super(type, eventInitDict);
            this.data = undefined;
            this.lastEventId = "";
            this.origin = "";
            this.ports = [];
            this.source = null;
            if (eventInitDict) {
                this.data = eventInitDict.data;
                this.lastEventId = (_p = eventInitDict.lastEventId) !== null && _p !== void 0 ? _p : "";
                this.origin = (_q = eventInitDict.origin) !== null && _q !== void 0 ? _q : "";
                this.ports = (_r = eventInitDict.ports) !== null && _r !== void 0 ? _r : [];
            }
        }
        initMessageEvent(type, bubbles, cancelable, data, origin, lastEventId, source, ports) {
            this.initEvent(type, bubbles !== null && bubbles !== void 0 ? bubbles : false, cancelable !== null && cancelable !== void 0 ? cancelable : false);
            Object.assign(this, { data, origin, lastEventId, source, ports });
        }
    };
}
const encoder = new TextEncoder();
const SSEMarkClosed = new Set();
const _closed = Symbol.for("closed");
const _request = Symbol.for("request");
const _response = Symbol.for("response");
const _writer = Symbol.for("writer");
const _reader = Symbol.for("reader");
const _lastEventId = Symbol.for("lastEventId");
const _reconnectionTime = Symbol.for("reconnectionTime");
const _retry = Symbol.for("retry");
const _timer = Symbol.for("timer");
const _controller = Symbol.for("_controller");
const _onopen = Symbol.for("onopen");
const _onerror = Symbol.for("onerror");
const _onmessage = Symbol.for("onmessage");
function setReadonly(obj, name, value) {
    Object.defineProperty(obj, name, {
        configurable: true,
        enumerable: false,
        writable: false,
        value,
    });
}
function getReadonly(obj, name) {
    var _p;
    return (_p = Object.getOwnPropertyDescriptor(obj, name)) === null || _p === void 0 ? void 0 : _p.value;
}
function fixStringTag(ctor) {
    setReadonly(ctor.prototype, Symbol.toStringTag, ctor.name);
}
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
        var _p, _q, _r, _s, _t;
        super();
        const isNodeRequest = "socket" in request && "socket" in args[0];
        let options;
        if (isNodeRequest) {
            const req = request;
            this[_lastEventId] = String((_p = req.headers["last-event-id"]) !== null && _p !== void 0 ? _p : "");
            options = (_q = args[1]) !== null && _q !== void 0 ? _q : {};
        }
        else {
            this[_lastEventId] = (_r = request.headers.get("Last-Event-ID")) !== null && _r !== void 0 ? _r : "";
            options = (_s = args[0]) !== null && _s !== void 0 ? _s : {};
        }
        this[_reconnectionTime] = (_t = options.reconnectionTime) !== null && _t !== void 0 ? _t : 0;
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
                            catch (_p) { }
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
     * It is important to note that the server depends on the last event ID to
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
fixStringTag(EventEndpoint);
/**
 * @deprecated Use {@link EventEndpoint} instead.
 */
const SSE = EventEndpoint;
/**
 * This is an implementation of the
 * [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
 * API that can be used in environments that do not have native support, such as
 * Node.js.
 *
 * NOTE: This API depends on the Fetch API, in Node.js, it requires Node.js
 * v18.4.1 or above.
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
    get url() {
        var _p;
        return (_p = getReadonly(this, "url")) !== null && _p !== void 0 ? _p : "";
    }
    get withCredentials() {
        var _p;
        return (_p = getReadonly(this, "withCredentials")) !== null && _p !== void 0 ? _p : false;
    }
    get readyState() {
        var _p;
        return (_p = getReadonly(this, "readyState")) !== null && _p !== void 0 ? _p : this.CONNECTING;
    }
    get onopen() {
        var _p;
        return (_p = this[_onopen]) !== null && _p !== void 0 ? _p : null;
    }
    set onopen(value) {
        this[_onopen] = value;
    }
    get onmessage() {
        var _p;
        return (_p = this[_onmessage]) !== null && _p !== void 0 ? _p : null;
    }
    set onmessage(value) {
        this[_onmessage] = value;
    }
    get onerror() {
        var _p;
        return (_p = this[_onerror]) !== null && _p !== void 0 ? _p : null;
    }
    set onerror(value) {
        this[_onerror] = value;
    }
    constructor(url, options = {}) {
        var _p;
        super();
        this[_a] = new AbortController();
        this[_b] = null;
        this[_c] = null;
        this[_d] = "";
        this[_e] = 0;
        this[_f] = 0;
        this[_g] = null;
        this[_h] = null;
        this[_j] = null;
        this[_k] = null;
        this.CONNECTING = EventSource.CONNECTING;
        this.OPEN = EventSource.OPEN;
        this.CLOSED = EventSource.CLOSED;
        url = new URL(url, typeof location === "object" ? location.origin : undefined).href;
        setReadonly(this, "url", url);
        setReadonly(this, "withCredentials", (_p = options.withCredentials) !== null && _p !== void 0 ? _p : false);
        setReadonly(this, "readyState", this.CONNECTING);
        setReadonly(this, "CONNECTING", EventSource.CONNECTING);
        setReadonly(this, "OPEN", EventSource.OPEN);
        setReadonly(this, "CLOSED", EventSource.CLOSED);
        this.connect().catch((err) => {
            console.error(err);
        });
    }
    async connect() {
        var _p, _q, _r, _s, _t, _u;
        if (this.readyState === this.CLOSED) {
            return;
        }
        const connectedBefore = this.readyState === this.OPEN;
        setReadonly(this, "readyState", this.CONNECTING);
        const headers = {
            "Accept": "text/event-stream",
        };
        if (this[_lastEventId]) {
            headers["Last-Event-ID"] = this[_lastEventId];
        }
        this[_request] = new Request(this.url, {
            headers,
            mode: this.withCredentials ? "cors" : "same-origin",
            credentials: this.withCredentials ? "include" : "same-origin",
            cache: "no-store",
            signal: this[_controller].signal,
        });
        const [err, res] = await _try(fetch(this[_request]));
        if (this.readyState === this.CLOSED) { // The connection is aborted
            return;
        }
        if (err || (res === null || res === void 0 ? void 0 : res.type) === "error") {
            if (!connectedBefore) { // The first attempt, fail the connection
                setReadonly(this, "readyState", this.CLOSED);
                const event = createErrorEvent("error", {
                    error: new Error(`Failed to fetch '${this.url}'`),
                });
                (_p = this.onerror) === null || _p === void 0 ? void 0 : _p.call(this, event);
                this.dispatchEvent(event);
            }
            else { // During reconnection, try again
                this.tryReconnect();
            }
            return;
        }
        else if (res.status === 204) { // No more data, close the connection
            setReadonly(this, "readyState", this.CLOSED);
            return;
        }
        else if (res.status !== 200) {
            setReadonly(this, "readyState", this.CLOSED);
            const event = createErrorEvent("error", {
                error: new Error(`The server responded with status ${res.status}.`),
            });
            (_q = this.onerror) === null || _q === void 0 ? void 0 : _q.call(this, event);
            this.dispatchEvent(event);
            return;
        }
        else if (!((_r = res.headers.get("Content-Type")) === null || _r === void 0 ? void 0 : _r.startsWith("text/event-stream"))) {
            const event = createErrorEvent("error", {
                error: new Error("The response is not an event stream."),
            });
            (_s = this.onerror) === null || _s === void 0 ? void 0 : _s.call(this, event);
            this.dispatchEvent(event);
            return;
        }
        else if (!res.body) {
            const event = createErrorEvent("error", {
                error: new Error("The response does not have a body."),
            });
            (_t = this.onerror) === null || _t === void 0 ? void 0 : _t.call(this, event);
            this.dispatchEvent(event);
            return;
        }
        setReadonly(this, "readyState", this.OPEN);
        this[_reader] = res.body.getReader();
        if (!connectedBefore) {
            const event = new Event("open");
            (_u = this.onopen) === null || _u === void 0 ? void 0 : _u.call(this, event);
            this.dispatchEvent(event);
        }
        this.readMessages(new URL(res.url || this.url).origin).catch(() => { });
    }
    async readMessages(origin) {
        var _p, _q, _r;
        const reader = this[_reader];
        const decoder = new TextDecoder();
        let buffer = "";
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    if (this.readyState !== this.CLOSED) {
                        const event = createErrorEvent("error", {
                            error: new Error("The connection is interrupted."),
                        });
                        (_p = this.onerror) === null || _p === void 0 ? void 0 : _p.call(this, event);
                        this.dispatchEvent(event);
                        this.tryReconnect();
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
                        (_q = this.onmessage) === null || _q === void 0 ? void 0 : _q.call(this, event);
                        this.dispatchEvent(event);
                    }
                }
            }
        }
        catch (error) {
            if (this.readyState !== this.CLOSED) {
                const event = createErrorEvent("error", { error });
                (_r = this.onerror) === null || _r === void 0 ? void 0 : _r.call(this, event);
                this.dispatchEvent(event);
            }
        }
    }
    tryReconnect() {
        if (this[_timer]) {
            clearTimeout(this[_timer]);
            this[_timer] = null;
        }
        this[_timer] = setTimeout(() => {
            this.connect().then(() => {
                this[_retry] = 0;
            }).catch(() => { });
        }, this[_reconnectionTime] || (1000 * Math.pow(2, this[_retry]++)));
    }
    /**
     * Closes the connection.
     */
    close() {
        if (this[_timer]) {
            clearTimeout(this[_timer]);
            this[_timer] = null;
        }
        setReadonly(this, "readyState", this.CLOSED);
        this[_controller].abort();
    }
    addEventListener(event, listener, options) {
        return super.addEventListener(event, listener, options);
    }
    [(_a = _controller, _b = _request, _c = _reader, _d = _lastEventId, _e = _reconnectionTime, _f = _retry, _g = _timer, _h = _onopen, _j = _onmessage, _k = _onerror, customInspect)]() {
        const _this = this;
        if (isDeno) {
            return "EventSource " + Deno.inspect({
                readyState: _this.readyState,
                url: _this.url,
                withCredentials: _this.withCredentials,
                onopen: _this.onopen,
                onmessage: _this.onmessage,
                onerror: _this.onerror,
            }, { colors: true });
        }
        else {
            return new class EventSource {
                constructor() {
                    this.readyState = _this.readyState;
                    this.url = _this.url;
                    this.withCredentials = _this.withCredentials;
                    this.onopen = _this.onopen;
                    this.onmessage = _this.onmessage;
                    this.onerror = _this.onerror;
                }
            };
        }
    }
}
EventSource.CONNECTING = 0;
EventSource.OPEN = 1;
EventSource.CLOSED = 2;
fixStringTag(EventSource);
/**
 * Unlike the {@link EventSource} API, which takes a URL and only supports GET
 * request, the {@link EventConsumer} API accepts a `Response` object and reads
 * the messages from its body, the response can be generated from any type of
 * request, usually returned from the `fetch` function.
 *
 * This API doesn't support active closure and reconnection, however, we can
 * use `AbortController` in the request to terminate the connection, and add
 * a event listener to the close event and reestablish the connection manually.
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
 * NOTE: This API depends on the Fetch API, in Node.js, it requires Node.js
 * v18.4.1 or above.
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
        var _p;
        super();
        this[_l] = "";
        this[_m] = 0;
        this[_o] = false;
        if (!response.body) {
            throw new TypeError("The response does not have a body.");
        }
        else if (response.bodyUsed) {
            throw new TypeError("The response body has already been used.");
        }
        else if (response.body.locked) {
            throw new TypeError("The response body is locked.");
        }
        else if (!((_p = response.headers.get("Content-Type")) === null || _p === void 0 ? void 0 : _p.startsWith("text/event-stream"))) {
            throw new TypeError("The response is not an event stream.");
        }
        this[_reader] = response.body.getReader();
        this.readMessages(response.url ? new URL(response.url).origin : "").catch(() => { });
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
    addEventListener(event, listener, options) {
        return super.addEventListener(event, listener, options);
    }
}
_l = _lastEventId, _m = _reconnectionTime, _o = _closed;
fixStringTag(EventConsumer);
/**
 * @deprecated Use {@link EventConsumer} instead.
 */
const EventClient = EventConsumer;

export { EventClient, EventConsumer, EventEndpoint, EventSource, SSE };
//# sourceMappingURL=sse.js.map
