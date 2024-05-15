import chan from "../chan.ts";

function isFunction(val: unknown): val is (...args: any[]) => any {
    return typeof val === "function";
}

async function* resolveAsyncIterable<T>(
    promise: Promise<AsyncIterable<T> | Iterable<T> | ReadableStream<T>>
): AsyncIterable<T> {
    const source = await promise;

    if ("getReader" in source) {
        const reader = source.getReader();

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    break;
                }

                yield value;
            }
        } finally {
            reader.releaseLock();
        }
    } else if ((typeof (source as any)[Symbol.asyncIterator] === "function")
        || (typeof (source as any)[Symbol.iterator] === "function")
    ) {
        yield* source;
    } else {
        throw new TypeError("The given source is not an async iterable object.");
    }
}

/**
 * When the iterable object or readable stream is being carried by a promise,
 * this function will resolve the promise and return a readable stream object
 * that iterates over the data.
 */
export function resolveReadableStream<T>(
    promise: Promise<AsyncIterable<T> | Iterable<T> | ReadableStream<T>>,
): ReadableStream<T>;
/**
 * When the `type` is set to `"bytes"`, that mean the underlying stream is a
 * byte stream and we shall use zero-copy buffer to transfer the data.
 */
export function resolveReadableStream<Uint8Array>(
    promise: Promise<ReadableStream<Uint8Array>>,
    type: "bytes"
): ReadableStream<Uint8Array>;
export function resolveReadableStream<T>(
    promise: Promise<AsyncIterable<T> | Iterable<T> | ReadableStream<T>>,
    type: "default" | "bytes" = "default"
): ReadableStream<T> {
    if (type === "default") {
        let reader: ReadableStreamDefaultReader<T> | AsyncIterator<T> | Iterator<T> | undefined;
        return new ReadableStream<T>({
            async start() {
                const _reader = await promise;

                if ("getReader" in _reader) {
                    reader = _reader.getReader();
                } else if (typeof (_reader as any)[Symbol.asyncIterator] === "function") {
                    reader = (_reader as AsyncIterable<T>)[Symbol.asyncIterator]();
                } else {
                    reader = (_reader as Iterable<T>)[Symbol.iterator]();
                }
            },
            async pull(controller) {
                let done: boolean;
                let value: T | undefined;

                if ("read" in reader!) {
                    ({ done, value } = await reader.read());
                } else {
                    ({ done = false, value } = await reader!.next());
                }

                if (done) {
                    controller.close();
                } else {
                    controller.enqueue(value);
                }
            },
            cancel(reason = undefined) {
                if (reader && "cancel" in reader) {
                    reader.cancel(reason);
                }
            },
        });
    } else {
        let reader: ReadableStreamBYOBReader;
        return new ReadableStream<Uint8Array>({
            type: "bytes",
            async start() {
                const _reader = await promise as ReadableStream<Uint8Array>;
                reader = _reader.getReader({ mode: "byob" });
            },
            async pull(controller) {
                if ((controller as any).byobRequest) {
                    const byobRequest = (controller as ReadableByteStreamController).byobRequest!;
                    const buffer = byobRequest.view!.buffer;
                    const { done, value } = await reader.read(new Uint8Array(buffer));

                    if (done) {
                        controller.close();
                    } else {
                        byobRequest.respond(value.byteLength);
                    }
                } else {
                    const buffer = new ArrayBuffer(4096);
                    const { done, value } = await reader.read(new Uint8Array(buffer));

                    if (done) {
                        controller.close();
                    } else {
                        controller.enqueue(value);
                    }
                }
            },
            cancel(reason = undefined) {
                if (reader && "cancel" in reader) {
                    reader.cancel(reason);
                }
            },
        }) as ReadableStream<T>;
    }
}

/**
 * Converts the given `source` into an `AsyncIterable` object if it's not one
 * already, returns `null` if failed.
 */
export function asAsyncIterable(source: any): AsyncIterable<any> | null {
    if (typeof source[Symbol.asyncIterator] === "function") {
        return source;
    } else if (typeof source[Symbol.iterator] === "function") {
        return {
            [Symbol.asyncIterator]: async function* () {
                for (const value of source) {
                    yield value;
                }
            },
        };
    } else if (typeof ReadableStream === "function"
        && source instanceof ReadableStream
    ) {
        const reader = source.getReader();
        return {
            [Symbol.asyncIterator]: async function* () {
                try {
                    while (true) {
                        const { done, value } = await reader.read();

                        if (done) {
                            break;
                        }

                        yield value;
                    }
                } finally {
                    reader.releaseLock();
                }
            },
        };
    } else if (typeof source["then"] === "function") {
        return resolveAsyncIterable(source);
    }

    return null;
}

/**
 * Wraps a source as an `AsyncIterable` object that can be used in the
 * `for await...of...` loop for reading streaming data.
 */
export function toAsyncIterable<T>(
    iterable: AsyncIterable<T> | Iterable<T> | Promise<AsyncIterable<T> | Iterable<T>>
): AsyncIterable<T>;
/**
 * @example
 * ```ts
 * import { toAsyncIterable } from "@ayonli/jsext/reader";
 * 
 * const res = new Response("Hello, World!");
 * 
 * for await (const chunk of toAsyncIterable(res.body!)) {
 *     console.log("receive chunk:", chunk);
 * }
 * ```
 */
export function toAsyncIterable<T>(
    stream: ReadableStream<T> | Promise<ReadableStream<T>>
): AsyncIterable<T>;
/**
 * @example
 * ```ts
 * import { toAsyncIterable } from "@ayonli/jsext/reader";
 * 
 * // listen to the `onmessage`
 * const sse = new EventSource("/sse/message");
 * 
 * for await (const msg of toAsyncIterable(sse)) {
 *     console.log("receive message:", msg);
 * }
 * 
 * // listen to a specific event
 * const channel = new EventSource("/sse/broadcast");
 * 
 * for await (const msg of toAsyncIterable(channel, { event: "broadcast" })) {
 *     console.log("receive message:", msg);
 * }
 * ```
 */
export function toAsyncIterable(es: EventSource, options?: { event?: string; }): AsyncIterable<string>;
/**
 * @example
 * ```ts
 * import { toAsyncIterable } from "@ayonli/jsext/reader";
 * 
 * const ws = new WebSocket("/ws");
 * 
 * for await (const msg of toAsyncIterable(ws)) {
 *     if (typeof data === "string") {
 *         console.log("receive text message:", data);
 *     } else {
 *         console.log("receive binary data:", data);
 *     }
 * }
 * ```
 */
export function toAsyncIterable<T extends Uint8Array | string>(ws: WebSocket): AsyncIterable<T>;
/**
 * @example
 * ```ts
 * import { toAsyncIterable } from "@ayonli/jsext/reader";
 * 
 * for await (const msg of toAsyncIterable(self)) {
 *     console.log("receive message from the parent window:", msg);
 * }
 * ```
 */
export function toAsyncIterable<T>(target: EventTarget, eventMap?: {
    message?: string;
    error?: string;
    close?: string;
}): AsyncIterable<T>;
/**
 * @example
 * ```ts
 * import { toAsyncIterable } from "@ayonli/jsext/reader";
 * 
 * for await (const msg of toAsyncIterable(process)) {
 *     console.log("receive message from the parent process:", msg);
 * }
 * ```
 */
export function toAsyncIterable<T>(target: NodeJS.EventEmitter, eventMap?: {
    data?: string;
    error?: string;
    close?: string;
}): AsyncIterable<T>;
export function toAsyncIterable<T>(source: any, eventMap: {
    event?: string; // for EventSource custom event
    message?: string;
    data?: string;
    error?: string;
    close?: string;
} | undefined = undefined): AsyncIterable<T> {
    const iterable = asAsyncIterable(source);

    if (iterable) {
        return iterable;
    }

    const channel = chan<T>(Infinity);
    const handleMessage = channel.send.bind(channel);
    const handleClose = channel.close.bind(channel);
    const handleBrowserErrorEvent = (ev: Event) => {
        let err: Error;

        if (typeof ErrorEvent === "function" && ev instanceof ErrorEvent) {
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
            // EventSource by default does not trigger close event, we need to
            // make sure when it calls the close() function, the iterator is
            // automatically closed.
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
        throw new TypeError("The  source cannot be converted to an async iterable object.");
    }

    return {
        [Symbol.asyncIterator]: channel[Symbol.asyncIterator].bind(channel),
    };
}
