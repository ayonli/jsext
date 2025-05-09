import '../external/event-target-polyfill/index.js';
import chan from '../chan.js';
import { fromErrorEvent } from '../error.js';

var _a;
const _source = Symbol.for("source");
const _socket = Symbol.for("socket");
/**
 * This class represents a WebSocket connection on the server side.
 * Normally we don't create instances of this class directly, but rather use
 * the {@link WebSocketServer} to handle WebSocket connections, which will
 * create the instance for us.
 *
 * **Events:**
 *
 * - `open` - Dispatched when the connection is ready.
 * - `message` - Dispatched when a message is received.
 * - `error` - Dispatched when an error occurs, such as network failure. After
 *   this event is dispatched, the connection will be closed and the `close`
 *   event will be dispatched.
 * - `close` - Dispatched when the connection is closed. If the connection is
 *   closed due to some error, the `error` event will be dispatched before this
 *   event, and the close event will have the `wasClean` set to `false`, and the
 *   `reason` property contains the error message, if any.
 */
class WebSocketConnection extends EventTarget {
    constructor(source) {
        super();
        this[_a] = null;
        this[_source] = source;
        this[_source].then(ws => {
            this[_socket] = ws;
        });
    }
    /**
     * A promise that resolves when the connection is ready to send and receive
     * messages.
     *
     * @deprecated Listen for the `open` event instead.
     */
    get ready() {
        return this[_source].then(() => this);
    }
    /**
     * The current state of the WebSocket connection.
     */
    get readyState() {
        var _b, _c;
        return (_c = (_b = this[_socket]) === null || _b === void 0 ? void 0 : _b.readyState) !== null && _c !== void 0 ? _c : 0;
    }
    get socket() {
        if (!this[_socket]) {
            throw new Error("WebSocket connection is not ready.");
        }
        return this[_socket];
    }
    /**
     * Sends data to the WebSocket client.
     */
    send(data) {
        this.socket.send(data);
    }
    /**
     * Closes the WebSocket connection.
     */
    close(code, reason) {
        this.socket.close(code, reason);
    }
    addEventListener(event, listener, options = undefined) {
        return super.addEventListener(event, listener, options);
    }
    removeEventListener(event, listener, options = undefined) {
        return super.removeEventListener(event, listener, options);
    }
    async *[(_a = _socket, Symbol.asyncIterator)]() {
        const channel = chan(Infinity);
        const handleMessage = (ev) => {
            channel.send(ev.data);
        };
        const handleClose = (ev) => {
            ev.wasClean && channel.close();
        };
        const handleError = (ev) => {
            channel.close(fromErrorEvent(ev));
        };
        this.addEventListener("message", handleMessage);
        this.addEventListener("close", handleClose);
        this.addEventListener("error", handleError);
        try {
            for await (const data of channel) {
                yield data;
            }
        }
        finally {
            this.removeEventListener("message", handleMessage);
            this.removeEventListener("close", handleClose);
            this.removeEventListener("error", handleError);
        }
    }
}

export { WebSocketConnection };
//# sourceMappingURL=base.js.map
