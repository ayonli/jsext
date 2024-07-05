import { asyncTask } from '../async.js';
import chan from '../chan.js';
import { fromErrorEvent } from '../error.js';

const _source = Symbol.for("source");
const _readyTask = Symbol.for("readyTask");
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
        this[_source] = source;
        this[_readyTask] = asyncTask();
        if (source.readyState === 1) {
            this[_readyTask].resolve();
        }
        else if (typeof source.addEventListener === "function") {
            source.addEventListener("open", () => {
                this[_readyTask].resolve();
            });
        }
        else {
            source.onopen = () => {
                this[_readyTask].resolve();
            };
        }
    }
    /**
     * A promise that resolves when the connection is ready to send and receive
     * messages.
     */
    get ready() {
        return this[_readyTask].then(() => this);
    }
    /**
     * The current state of the WebSocket connection.
     */
    get readyState() {
        return this[_source].readyState;
    }
    /**
     * Sends data to the WebSocket client.
     */
    send(data) {
        this[_source].send(data);
    }
    /**
     * Closes the WebSocket connection.
     */
    close(code, reason) {
        this[_source].close(code, reason);
    }
    addEventListener(event, listener, options) {
        return super.addEventListener(event, listener, options);
    }
    async *[Symbol.asyncIterator]() {
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
