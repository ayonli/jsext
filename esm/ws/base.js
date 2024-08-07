import '../external/event-target-polyfill/index.js';
import chan from '../chan.js';
import { fromErrorEvent } from '../error.js';

var _a;
const _source = Symbol.for("source");
const _ws = Symbol.for("ws");
/**
 * This class represents a WebSocket connection on the server side.
 * Normally we don't create instances of this class directly, but rather use
 * the {@link WebSocketServer} to handle WebSocket connections, which will
 * create the instance for us.
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
 * - `message` - Dispatched when a message is received.
 *
 * There is no `open` event, because when an connection instance is created, the
 * connection may already be open. However, there is a `ready` promise that can
 * be used to ensure that the connection is ready before sending messages.
 */
class WebSocketConnection extends EventTarget {
    constructor(source) {
        super();
        this[_a] = null;
        this[_source] = source;
        this[_source].then(ws => {
            this[_ws] = ws;
        });
    }
    /**
     * A promise that resolves when the connection is ready to send and receive
     * messages.
     */
    get ready() {
        return this[_source].then(() => this);
    }
    /**
     * The current state of the WebSocket connection.
     */
    get readyState() {
        var _b, _c;
        return (_c = (_b = this[_ws]) === null || _b === void 0 ? void 0 : _b.readyState) !== null && _c !== void 0 ? _c : 0;
    }
    /**
     * Sends data to the WebSocket client.
     */
    send(data) {
        if (!this[_ws]) {
            throw new Error("WebSocket connection is not ready");
        }
        this[_ws].send(data);
    }
    /**
     * Closes the WebSocket connection.
     */
    close(code, reason) {
        if (!this[_ws]) {
            throw new Error("WebSocket connection is not ready");
        }
        this[_ws].close(code, reason);
    }
    addEventListener(event, listener, options) {
        return super.addEventListener(event, listener, options);
    }
    async *[(_a = _ws, Symbol.asyncIterator)]() {
        const channel = chan(Infinity);
        this.addEventListener("message", ev => {
            channel.send(ev.data);
        });
        this.addEventListener("close", ev => {
            ev.wasClean && channel.close();
        });
        this.addEventListener("error", ev => {
            channel.close(fromErrorEvent(ev));
        });
        for await (const data of channel) {
            yield data;
        }
    }
}

export { WebSocketConnection };
//# sourceMappingURL=base.js.map
