import { AsyncTask, asyncTask } from "../async.ts";
import chan from "../chan.ts";
import { fromErrorEvent } from "../error.ts";
import type { Ensured } from "../types.ts";
import type { WebSocketServer } from "../ws.ts";

const _source = Symbol.for("source");
const _readyTask = Symbol.for("readyTask");

export type WebSocketLike = Ensured<Partial<WebSocket>, "readyState" | "close" | "send">;

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
export class WebSocketConnection extends EventTarget implements AsyncIterable<string | Uint8Array> {
    private [_source]: WebSocketLike;
    private [_readyTask]: AsyncTask<void>;

    constructor(source: WebSocketLike) {
        super();
        this[_source] = source;
        this[_readyTask] = asyncTask<void>();

        if (source.readyState === 1) {
            this[_readyTask].resolve();
        } else if (typeof source.addEventListener === "function") {
            source.addEventListener("open", () => {
                this[_readyTask].resolve();
            });
        } else {
            source.onopen = () => {
                this[_readyTask].resolve();
            };
        }
    }

    /**
     * A promise that resolves when the connection is ready to send and receive
     * messages.
     */
    get ready(): Promise<this> {
        return this[_readyTask].then(() => this);
    }

    /**
     * The current state of the WebSocket connection.
     */
    get readyState(): number {
        return this[_source].readyState;
    }

    /**
     * Sends data to the WebSocket client.
     */
    send(data: string | ArrayBufferLike | ArrayBufferView): void {
        this[_source].send(data);
    }

    /**
     * Closes the WebSocket connection.
     */
    close(code?: number | undefined, reason?: string | undefined): void {
        this[_source].close(code, reason);
    }

    /**
     * Adds an event listener that will be called when the connection is
     * interrupted. After this event is dispatched, the connection will be
     * closed and the `close` event will be dispatched.
     */
    override addEventListener(
        type: "error",
        listener: (this: WebSocketConnection, ev: ErrorEvent) => void,
        options?: boolean | AddEventListenerOptions
    ): void;
    /**
     * Adds an event listener that will be called when the connection is closed.
     * If the connection is closed due to some error, the `error` event will be
     * dispatched before this event, and the close event will have the `wasClean`
     * set to `false`, and the `reason` property contains the error message, if
     * any.
     */
    override addEventListener(
        type: "close",
        listener: (this: WebSocketConnection, ev: CloseEvent) => void,
        options?: boolean | AddEventListenerOptions
    ): void;
    /**
     * Adds an event listener that will be called when a message is received.
     */
    override addEventListener(
        type: "message",
        listener: (this: WebSocketConnection, ev: MessageEvent<string | Uint8Array>) => void,
        options?: boolean | AddEventListenerOptions
    ): void;
    override addEventListener(
        type: string,
        listener: (this: WebSocketConnection, event: Event) => any,
        options?: boolean | AddEventListenerOptions
    ): void;
    override addEventListener(
        event: string,
        listener: any,
        options?: boolean | AddEventListenerOptions
    ): void {
        return super.addEventListener(
            event,
            listener as EventListenerOrEventListenerObject,
            options
        );
    }

    async *[Symbol.asyncIterator](): AsyncIterableIterator<string | Uint8Array> {
        const channel = chan<string | Uint8Array>(Infinity);

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

/**
 * WebSocket handler function for the {@link WebSocketServer} constructor.
 */
export type WebSocketHandler = (socket: WebSocketConnection) => void;

/**
 * Options for the {@link WebSocketServer} constructor.
 */
export interface ServerOptions {
    /**
     * The idle timeout in seconds. The server will close the connection if no
     * messages are received within this time.
     * 
     * NOTE: Currently, this option is only supported in Deno and Bun, in other
     * environments, the option is ignored.
     */
    idleTimeout?: number;
    /**
     * Whether to enable per-message deflate compression.
     * 
     * NOTE: Currently, this option is only supported in Node.js and Bun, in
     * other environments, the option is ignored.
     */
    perMessageDeflate?: boolean;
}
