import './external/event-target-polyfill/index.js';
import { fixStringTag, getReadonly, setReadonly } from './class/util.js';
import { isDeno } from './env.js';
import './error.js';
import { createCloseEvent, createErrorEvent } from './event.js';
import runtime, { customInspect } from './runtime.js';
import { try_ } from './result.js';
import { NetworkError } from './error/common.js';

var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
if (typeof MessageEvent !== "function" || runtime().identity === "workerd") {
    // Worker environments does not implement or only partially implement the MessageEvent, 
    // we need to implement it ourselves.
    globalThis.MessageEvent = class MessageEvent extends Event {
        constructor(type, eventInitDict = undefined) {
            var _o, _p, _q;
            super(type, eventInitDict);
            this.data = undefined;
            this.lastEventId = "";
            this.origin = "";
            this.ports = [];
            this.source = null;
            if (eventInitDict) {
                this.data = eventInitDict.data;
                this.lastEventId = (_o = eventInitDict.lastEventId) !== null && _o !== void 0 ? _o : "";
                this.origin = (_p = eventInitDict.origin) !== null && _p !== void 0 ? _p : "";
                this.ports = (_q = eventInitDict.ports) !== null && _q !== void 0 ? _q : [];
            }
        }
        initMessageEvent(type, bubbles = false, cancelable = false, data = null, origin = "", lastEventId = "", source = null, ports = []) {
            this.initEvent(type, bubbles !== null && bubbles !== void 0 ? bubbles : false, cancelable !== null && cancelable !== void 0 ? cancelable : false);
            Object.assign(this, { data, origin, lastEventId, source, ports });
        }
    };
}
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SSEMarkClosed = new Set();
const _closed = Symbol.for("closed");
const _request = Symbol.for("request");
const _response = Symbol.for("response");
const _writer = Symbol.for("writer");
const _lastEventId = Symbol.for("lastEventId");
const _reconnectionTime = Symbol.for("reconnectionTime");
const _retry = Symbol.for("retry");
const _timer = Symbol.for("timer");
const _controller = Symbol.for("controller");
const _onopen = Symbol.for("onopen");
const _onerror = Symbol.for("onerror");
const _onmessage = Symbol.for("onmessage");
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
        var _o, _p, _q, _r, _s;
        super();
        const isNodeRequest = "socket" in request && "socket" in args[0];
        let options;
        if (isNodeRequest) {
            const req = request;
            this[_lastEventId] = String((_o = req.headers["last-event-id"]) !== null && _o !== void 0 ? _o : "");
            options = (_p = args[1]) !== null && _p !== void 0 ? _p : {};
        }
        else {
            this[_lastEventId] = (_q = request.headers.get("Last-Event-ID")) !== null && _q !== void 0 ? _q : "";
            options = (_r = args[0]) !== null && _r !== void 0 ? _r : {};
        }
        this[_reconnectionTime] = (_s = options.reconnectionTime) !== null && _s !== void 0 ? _s : 0;
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
                "X-Accel-Buffering": "no", // For Nginx
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
                    res.closed || res.end();
                    _this[_closed] = true;
                    _this.dispatchEvent(createCloseEvent("close", { wasClean: true }));
                },
                abort(err) {
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
            // Send a non-empty chunk to ensure the client can parse the response
            // immediately.
            res.write(encoder.encode(":ok\n\n"));
        }
        else {
            const { writable, readable } = new TransformStream();
            const reader = readable.getReader();
            const _readable = new ReadableStream({
                async start(controller) {
                    // Send a non-empty chunk to ensure the client can parse the response
                    // immediately.
                    controller.enqueue(encoder.encode(":ok\n\n"));
                },
                async pull(controller) {
                    while (true) {
                        try {
                            const { done, value } = await reader.read();
                            if (done) {
                                try {
                                    controller.close();
                                }
                                catch (_o) { }
                                _this[_closed] = true;
                                _this.dispatchEvent(createCloseEvent("close", { wasClean: true }));
                                break;
                            }
                            controller.enqueue(value);
                        }
                        catch (error) {
                            try {
                                controller.error(error);
                            }
                            catch (_p) { }
                            _this[_closed] = true;
                            _this.dispatchEvent(createCloseEvent("close", {
                                reason: error instanceof Error ? error.message : String(error),
                                wasClean: false,
                            }));
                            break;
                        }
                    }
                },
                async cancel(reason) {
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
    addEventListener(event, listener, options = undefined) {
        return super.addEventListener(event, listener, options);
    }
    removeEventListener(type, listener, options = undefined) {
        return super.removeEventListener(type, listener, options);
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
async function readAndProcessResponse(response, handlers) {
    const reader = response.body.getReader();
    let buffer = "";
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                handlers.onEnd();
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
                        handlers.onId(line.slice(3).trim());
                        isMessage = true;
                    }
                    else if (line.startsWith("retry:")) {
                        const time = parseInt(line.slice(6).trim());
                        if (!isNaN(time) && time >= 0) {
                            handlers.onRetry(time);
                            isMessage = true;
                        }
                    }
                }
                if (isMessage) {
                    handlers.onData(data, type || "message");
                }
            }
        }
    }
    catch (error) {
        handlers.onError(error);
    }
}
/**
 * This is an implementation of the
 * [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
 * API that serves as a polyfill in environments that do not have native support,
 * such as Node.js.
 *
 * NOTE: This API depends on the Fetch API and Web Streams API, in Node.js, it
 * requires Node.js v18.0 or above.
 *
 * @example
 * ```ts
 * import { EventSource } from "@ayonli/jsext/sse";
 *
 * globalThis.EventSource ??= EventSource;
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
        var _o;
        return (_o = getReadonly(this, "url")) !== null && _o !== void 0 ? _o : "";
    }
    get withCredentials() {
        var _o;
        return (_o = getReadonly(this, "withCredentials")) !== null && _o !== void 0 ? _o : false;
    }
    get readyState() {
        var _o;
        return (_o = getReadonly(this, "readyState")) !== null && _o !== void 0 ? _o : this.CONNECTING;
    }
    get onopen() {
        var _o;
        return (_o = this[_onopen]) !== null && _o !== void 0 ? _o : null;
    }
    set onopen(value) {
        this[_onopen] = value;
    }
    get onmessage() {
        var _o;
        return (_o = this[_onmessage]) !== null && _o !== void 0 ? _o : null;
    }
    set onmessage(value) {
        this[_onmessage] = value;
    }
    get onerror() {
        var _o;
        return (_o = this[_onerror]) !== null && _o !== void 0 ? _o : null;
    }
    set onerror(value) {
        this[_onerror] = value;
    }
    constructor(url, options = {}) {
        var _o;
        super();
        this[_a] = new AbortController();
        this[_b] = null;
        this[_c] = "";
        this[_d] = 0;
        this[_e] = 0;
        this[_f] = null;
        this[_g] = null;
        this[_h] = null;
        this[_j] = null;
        this.CONNECTING = EventSource.CONNECTING;
        this.OPEN = EventSource.OPEN;
        this.CLOSED = EventSource.CLOSED;
        url = typeof url === "object" ? url.href : new URL(url, typeof location === "object" ? location.href : undefined).href;
        setReadonly(this, "url", url);
        setReadonly(this, "withCredentials", (_o = options.withCredentials) !== null && _o !== void 0 ? _o : false);
        setReadonly(this, "readyState", this.CONNECTING);
        setReadonly(this, "CONNECTING", EventSource.CONNECTING);
        setReadonly(this, "OPEN", EventSource.OPEN);
        setReadonly(this, "CLOSED", EventSource.CLOSED);
        this.connect().catch(() => { });
    }
    async connect() {
        var _o, _p, _q, _r, _s, _t, _u;
        if (this.readyState === this.CLOSED) {
            return;
        }
        setReadonly(this, "readyState", this.CONNECTING);
        const headers = {
            "Accept": "text/event-stream",
        };
        if (this[_lastEventId]) {
            headers["Last-Event-ID"] = this[_lastEventId];
        }
        this[_request] = new Request(this.url, {
            headers,
            credentials: this.withCredentials ? "include" : "same-origin",
            cache: "no-store",
            signal: this[_controller].signal,
        });
        const result = await try_(fetch(this[_request]));
        if (!result.ok) {
            const event = createErrorEvent("error", {
                error: result.error,
            });
            this.dispatchEvent(event);
            (_o = this.onerror) === null || _o === void 0 ? void 0 : _o.call(this, event);
            this.tryReconnect();
            return;
        }
        const res = result.value;
        if (res.type === "error") {
            const event = createErrorEvent("error", {
                error: new NetworkError(`Failed to fetch '${this.url}'`),
            });
            this.dispatchEvent(event);
            (_p = this.onerror) === null || _p === void 0 ? void 0 : _p.call(this, event);
            this.tryReconnect();
            return;
        }
        else if (res.status === 204) { // No more data, close the connection
            setReadonly(this, "readyState", this.CLOSED);
            return;
        }
        else if (res.status !== 200) {
            setReadonly(this, "readyState", this.CLOSED);
            const event = createErrorEvent("error", {
                error: new TypeError(`The server responded with status ${res.status}.`),
            });
            this.dispatchEvent(event);
            (_q = this.onerror) === null || _q === void 0 ? void 0 : _q.call(this, event);
            return;
        }
        else if (!((_r = res.headers.get("Content-Type")) === null || _r === void 0 ? void 0 : _r.startsWith("text/event-stream"))) {
            setReadonly(this, "readyState", this.CLOSED);
            const event = createErrorEvent("error", {
                error: new TypeError("The response is not an event stream."),
            });
            this.dispatchEvent(event);
            (_s = this.onerror) === null || _s === void 0 ? void 0 : _s.call(this, event);
            return;
        }
        else if (!res.body) {
            setReadonly(this, "readyState", this.CLOSED);
            const event = createErrorEvent("error", {
                error: new TypeError("The response does not have a body."),
            });
            this.dispatchEvent(event);
            (_t = this.onerror) === null || _t === void 0 ? void 0 : _t.call(this, event);
            return;
        }
        setReadonly(this, "readyState", this.OPEN);
        this[_retry] = 0;
        const event = new Event("open");
        this.dispatchEvent(event);
        (_u = this.onopen) === null || _u === void 0 ? void 0 : _u.call(this, event);
        const origin = new URL(res.url || this.url).origin;
        await readAndProcessResponse(res, {
            onId: (id) => {
                this[_lastEventId] = id;
            },
            onRetry: (time) => {
                this[_reconnectionTime] = time;
            },
            onData: (data, event) => {
                var _o;
                const _event = new MessageEvent(event, {
                    lastEventId: this[_lastEventId],
                    data,
                    origin,
                });
                this.dispatchEvent(_event);
                (_o = this.onmessage) === null || _o === void 0 ? void 0 : _o.call(this, _event);
            },
            onError: (error) => {
                var _o;
                if (this.readyState !== this.CLOSED) {
                    const event = createErrorEvent("error", { error });
                    this.dispatchEvent(event);
                    (_o = this.onerror) === null || _o === void 0 ? void 0 : _o.call(this, event);
                    this.tryReconnect();
                }
            },
            onEnd: () => {
                var _o;
                if (this.readyState !== this.CLOSED) {
                    const event = createErrorEvent("error", {
                        error: new Error("The connection is interrupted."),
                    });
                    this.dispatchEvent(event);
                    (_o = this.onerror) === null || _o === void 0 ? void 0 : _o.call(this, event);
                    this.tryReconnect();
                }
            },
        });
    }
    tryReconnect() {
        setReadonly(this, "readyState", this.CONNECTING);
        this[_timer] && clearTimeout(this[_timer]);
        this[_timer] = setTimeout(() => {
            this.connect().catch(() => { });
        }, this[_reconnectionTime] || 1000 * Math.min(30, Math.pow(2, this[_retry]++)));
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
    addEventListener(event, listener, options = undefined) {
        return super.addEventListener(event, listener, options);
    }
    removeEventListener(type, listener, options = undefined) {
        return super.removeEventListener(type, listener, options);
    }
    [(_a = _controller, _b = _request, _c = _lastEventId, _d = _reconnectionTime, _e = _retry, _f = _timer, _g = _onopen, _h = _onmessage, _j = _onerror, customInspect)]() {
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
 * NOTE: This API depends on the Fetch API and Web Streams API, in Node.js, it
 * requires Node.js v18.0 or above.
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
        var _o;
        super();
        this[_k] = "";
        this[_l] = 0;
        this[_m] = false;
        if (!response.body) {
            throw new TypeError("The response does not have a body.");
        }
        else if (response.bodyUsed) {
            throw new TypeError("The response body has already been used.");
        }
        else if (response.body.locked) {
            throw new TypeError("The response body is locked.");
        }
        else if (!((_o = response.headers.get("Content-Type")) === null || _o === void 0 ? void 0 : _o.startsWith("text/event-stream"))) {
            throw new TypeError("The response is not an event stream.");
        }
        const origin = response.url ? new URL(response.url).origin : "";
        readAndProcessResponse(response, {
            onId: (id) => {
                this[_lastEventId] = id;
            },
            onRetry: (time) => {
                this[_reconnectionTime] = time;
            },
            onData: (data, event) => {
                this.dispatchEvent(new MessageEvent(event, {
                    lastEventId: this[_lastEventId],
                    data,
                    origin,
                }));
            },
            onError: (error) => {
                this[_closed] = true;
                this.dispatchEvent(createErrorEvent("error", { error }));
                this.dispatchEvent(createCloseEvent("close", {
                    reason: error instanceof Error ? error.message : String(error),
                    wasClean: false,
                }));
            },
            onEnd: () => {
                this[_closed] = true;
                this.dispatchEvent(createCloseEvent("close", { wasClean: true }));
            },
        }).catch(() => { });
    }
    /**
     * The last event ID that the server has sent.
     */
    get lastEventId() {
        return this[_lastEventId];
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
    /**
     * Indicates whether the connection has been closed.
     */
    get closed() {
        return this[_closed];
    }
    addEventListener(event, listener, options = undefined) {
        return super.addEventListener(event, listener, options);
    }
    removeEventListener(type, listener, options = undefined) {
        return super.removeEventListener(type, listener, options);
    }
}
_k = _lastEventId, _l = _reconnectionTime, _m = _closed;
fixStringTag(EventConsumer);

export { EventConsumer, EventEndpoint, EventSource };
//# sourceMappingURL=sse.js.map
