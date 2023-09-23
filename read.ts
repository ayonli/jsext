import chan from "./chan.ts";
import { isFunction } from "./try.ts";

/**
 * Wraps a source as an AsyncIterable object that can be used in the `for await...of...` loop
 * for reading streaming data.
 */
export default function read<I extends AsyncIterable<any>>(iterable: I): I;
/**
 * @example
 * ```ts
 * // listen to the `onmessage`
 * const sse = new EventSource("/sse/message");
 * 
 * for await (const msg of read(sse)) {
 *     console.log("receive message:", msg);
 * }
 * 
 * // listen to a specific event
 * const channel = new EventSource("/sse/broadcast");
 * 
 * for await (const msg of read(channel, { event: "broadcast" })) {
 *     console.log("receive message:", msg);
 * }
 * ```
 */
export default function read(es: EventSource, options?: { event?: string; }): AsyncIterable<string>;
/**
 * @example
 * ```ts
 * const ws = new WebSocket("/ws");
 * 
 * for await (const msg of read(ws)) {
 *     if (typeof data === "string") {
 *         console.log("receive text message:", data);
 *     } else {
 *         console.log("receive binary data:", data);
 *     }
 * }
 * ```
 */
export default function read<T extends Uint8Array | string>(ws: WebSocket): AsyncIterable<T>;
/**
 * @example
 * ```ts
 * for await (const msg of read(self)) {
 *     console.log("receive message from the parent window:", msg);
 * }
 * ```
 */
export default function read<T>(target: EventTarget, eventMap?: {
    message?: string;
    error?: string;
    close?: string;
}): AsyncIterable<T>;
/**
 * @example
 * ```ts
 * for await (const msg of read(process)) {
 *     console.log("receive message from the parent process:", msg);
 * }
 * ```
 */
export default function read<T>(target: NodeJS.EventEmitter, eventMap?: {
    data?: string;
    error?: string;
    close?: string;
}): AsyncIterable<T>;
export default function read<T>(source: any, eventMap: {
    event?: string; // for EventSource custom event
    message?: string;
    data?: string;
    error?: string;
    close?: string;
} | undefined = undefined): AsyncIterable<T> {
    if (isFunction(source[Symbol.asyncIterator])) {
        return source;
    }

    const channel = chan<T>(Infinity);
    const handleMessage = channel.push.bind(channel);
    const handleClose = channel.close.bind(channel);
    const handleBrowserErrorEvent = (ev: Event) => {
        let err: Error;

        if (ev instanceof ErrorEvent) {
            err = ev.error || new Error(ev.message);
        } else {
            // @ts-ignore
            err = new Error("something went wrong", { cause: ev });
        }

        handleClose(err);
    };

    const proto = Object.getPrototypeOf(source);
    const msgDesc = Object.getOwnPropertyDescriptor(proto, "onmessage");

    if (msgDesc?.set && isFunction(source["close"])) { // WebSocket or EventSource
        const errDesc = Object.getOwnPropertyDescriptor(proto, "onerror");
        const closeDesc = Object.getOwnPropertyDescriptor(proto, "onclose");
        let cleanup: () => void;

        if (eventMap?.event &&
            eventMap?.event !== "message" &&
            isFunction(source["addEventListener"])
        ) { // for EventSource listening on custom events
            const es = source as EventSource;
            const eventName = eventMap.event;
            const msgListener = (ev: MessageEvent<T>) => {
                handleMessage(ev.data);
            };

            es.addEventListener(eventName, msgListener);
            cleanup = () => {
                es.removeEventListener(eventName, msgListener);
            };
        } else {
            msgDesc.set.call(source, (ev: MessageEvent<T>) => {
                handleMessage(ev.data);
            });
            cleanup = () => {
                msgDesc.set?.call(source, null);
            };
        }

        errDesc?.set?.call(source, handleBrowserErrorEvent);

        if (closeDesc?.set) { // WebSocket
            closeDesc.set.call(source, () => {
                handleClose();
                closeDesc.set?.call(source, null);
                errDesc?.set?.call(source, null);
                cleanup?.();
            });
        } else if (!closeDesc?.set && isFunction(source["close"])) { // EventSource
            // EventSource by default does not trigger close event, we need to make sure when
            // it calls the close() function, the iterator is automatically closed.
            const es = source as EventSource;
            const _close = es.close;
            es.close = function close() {
                _close.call(es);
                handleClose();
                es.close = _close;
                errDesc?.set?.call(source, null);
                cleanup?.();
            };
        }
    } else if (isFunction(source["send"]) && isFunction(source["close"])) {
        // non-standard WebSocket implementation
        const ws = source as WebSocket;
        ws.onmessage = (ev: MessageEvent<T>) => {
            handleMessage(ev.data);
        };
        ws.onerror = handleBrowserErrorEvent;
        ws.onclose = () => {
            handleClose();
            ws.onclose = null;
            ws.onerror = null;
            ws.onmessage = null;
        };
    } else if (isFunction(source["addEventListener"])) { // EventTarget
        const target = source as EventTarget;
        const msgEvent = eventMap?.message || "message";
        const errEvent = eventMap?.error || "error";
        const closeEvent = eventMap?.close || "close";
        const msgListener = (ev: Event) => {
            if (ev instanceof MessageEvent) {
                handleMessage(ev.data);
            }
        };

        target.addEventListener(msgEvent, msgListener);
        target.addEventListener(errEvent, handleBrowserErrorEvent);
        target.addEventListener(closeEvent, function closeListener() {
            handleClose();
            target.removeEventListener(closeEvent, closeListener);
            target.removeEventListener(msgEvent, msgListener);
            target.removeEventListener(errEvent, handleBrowserErrorEvent);
        });
    } else if (isFunction(source["on"])) { // EventEmitter
        const target = source as NodeJS.EventEmitter;
        let dataEvent: string;
        let errEvent: string;
        let closeEvent: string;

        if (typeof process === "object" && source === process) {
            dataEvent = "message";
            errEvent = "uncaughtException";
            closeEvent = "exit";
        } else if (
            (isFunction(source["send"]) && isFunction(source["kill"])) || // child process
            (isFunction(source["postMessage"]) && isFunction(source["terminate"])) || // worker thread
            (isFunction(source["postMessage"]) && isFunction(source["close"])) // message port
        ) {
            dataEvent = "message";
            errEvent = "error";
            closeEvent = "exit";
        } else {
            dataEvent = eventMap?.data || "data";
            errEvent = eventMap?.error || "error";
            closeEvent = eventMap?.close || "close";
        }

        target.on(dataEvent, handleMessage);
        target.once(errEvent, handleClose);
        target.once(closeEvent, () => {
            handleClose();
            target.off(dataEvent, handleMessage);
            target.off(errEvent, handleClose);
        });
    } else {
        throw new TypeError("the input source cannot be read as an AsyncIterable object");
    }

    return {
        [Symbol.asyncIterator]: channel[Symbol.asyncIterator].bind(channel),
    };
}

/**
 * Reads all values from the iterable object at once.
 * 
 * @example
 * ```ts
 * const file = fs.createReadStream("./package.json");
 * const chunks = await readAll(file);
 * ```
 */
export async function readAll<T>(iterable: AsyncIterable<T>): Promise<T[]> {
    const list: T[] = [];

    for await (const chunk of iterable) {
        list.push(chunk)
    }

    return list;
}
