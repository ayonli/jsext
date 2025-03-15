import { getReadonly, setReadonly } from '../class/util.js';
import '../bytes.js';
import '../error/Exception.js';
import '../external/event-target-polyfill/index.js';
import { NotSupportedError, NetworkError } from '../error/common.js';
import { WebSocketConnection } from './base.js';

/**
 * A `WebSocket` polyfill for Node.js before v21.
 * See https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
 *
 * NOTE: Must install the package from NPM to use this polyfill. If the runtime
 * already supports the global `WebSocket` class, this variable will be that
 * class instead of the polyfill one.
 */
const WebSocket = globalThis.WebSocket;
const _ws = Symbol.for("ws");
function initWebSocketStream(wss, ws) {
    ws.binaryType = "arraybuffer";
    setReadonly(wss, "url", ws.url);
    setReadonly(wss, "opened", new Promise((resolve, reject) => {
        ws.addEventListener("open", () => {
            resolve({
                extensions: ws.extensions,
                protocol: ws.protocol,
                readable: new ReadableStream({
                    start(controller) {
                        ws.addEventListener("message", ({ data }) => {
                            if (typeof data === "string") {
                                controller.enqueue(data);
                            }
                            else if (data instanceof ArrayBuffer) {
                                controller.enqueue(new Uint8Array(data));
                            }
                            else if (data instanceof Uint8Array) {
                                controller.enqueue(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
                            }
                            else {
                                ws.close(1003, "Unsupported message type");
                            }
                        });
                        ws.addEventListener("close", () => {
                            try {
                                controller.close();
                            }
                            catch (_a) { }
                        });
                    },
                    cancel() {
                        ws.close();
                    },
                }),
                writable: new WritableStream({
                    write(chunk) {
                        ws.send(chunk);
                    },
                }),
            });
        });
        ws.addEventListener("error", () => {
            reject(new NetworkError("Failed to establish WebSocket connection."));
        });
    }));
    setReadonly(wss, "closed", new Promise((resolve) => {
        ws.addEventListener("close", (ev) => {
            resolve({
                closeCode: ev.code,
                reason: ev.reason,
            });
        });
    }));
}
/**
 * A `WebSocketStream` polyfill.
 * See https://developer.mozilla.org/en-US/docs/Web/API/WebSocketStream
 *
 * NOTE: This API depends on the Web Streams API, in Node.js, it requires
 * Node.js v18.0 or above.
 *
 * NOTE: This implementation is based on the `WebSocket` API and supports
 * half-close, closing the writable stream will not close the connection, the
 * connection will only be closed when the `close` method is called or the
 * readable stream is canceled.
 *
 * @example
 * ```ts
 * // usage
 * globalThis.WebSocketStream ??= (await import("@ayonli/jsext/ws")).WebSocketStream;
 * ```
 */
class WebSocketStream {
    get url() {
        return getReadonly(this, "url");
    }
    get opened() {
        return getReadonly(this, "opened");
    }
    get closed() {
        return getReadonly(this, "closed");
    }
    constructor(url, options = {}) {
        if (typeof globalThis.WebSocket !== "function") {
            throw new NotSupportedError("WebSocket is not supported in this environment.");
        }
        const { protocols, signal } = options;
        const ws = this[_ws] = new globalThis.WebSocket(url, protocols);
        initWebSocketStream(this, ws);
        signal === null || signal === void 0 ? void 0 : signal.addEventListener("abort", () => ws.close());
    }
    close(options = {}) {
        var _a;
        const { closeCode, reason } = options;
        (_a = this[_ws]) === null || _a === void 0 ? void 0 : _a.close(closeCode, reason);
    }
}
// If the global `WebSocketStream` class is available, inherit from it, so that
// the `instanceof` operator works properly.
// @ts-ignore
if (typeof globalThis.WebSocketStream === "function") {
    // @ts-ignore
    Object.setPrototypeOf(WebSocketStream, globalThis.WebSocketStream);
    // @ts-ignore
    Object.setPrototypeOf(WebSocketStream.prototype, globalThis.WebSocketStream.prototype);
}
/**
 * Transforms a `WebSocket` or {@link WebSocketConnection} instance into a
 * {@link WebSocketStream} instance.
 */
function toWebSocketStream(ws) {
    const wss = Object.create(WebSocketStream.prototype);
    if (ws instanceof WebSocketConnection) {
        wss[_ws] = ws;
        setReadonly(wss, "url", "");
        setReadonly(wss, "opened", ws.ready.then(() => ({
            extensions: "",
            protocol: "",
            readable: new ReadableStream({
                start(controller) {
                    ws.addEventListener("message", ({ data }) => {
                        controller.enqueue(data);
                    });
                    ws.addEventListener("close", () => {
                        try {
                            controller.close();
                        }
                        catch (_a) { }
                    });
                },
                cancel() {
                    ws.close();
                },
            }),
            writable: new WritableStream({
                write(chunk) {
                    ws.send(chunk);
                },
            }),
        })));
        setReadonly(wss, "closed", new Promise((resolve) => {
            ws.addEventListener("close", (ev) => {
                resolve({
                    closeCode: ev.code,
                    reason: ev.reason,
                });
            });
        }));
    }
    else {
        initWebSocketStream(wss, ws);
    }
    return wss;
}

export { WebSocket, WebSocketStream, toWebSocketStream };
//# sourceMappingURL=client.js.map
