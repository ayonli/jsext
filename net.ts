import { asyncTask } from "./async.ts";
import { isBun, isDeno, isNode } from "./env.ts";
import { ConnectOptions, Socket } from "./net/types.ts";
import { constructNetAddress } from "./net/util.ts";

export type * from "./net/types.ts";

/**
 * Returns a random port number that is available for listening.
 * 
 * NOTE: This function is not available in the browser and worker runtimes such
 * as Cloudflare Workers.
 * 
 * @param prefer The preferred port number to return if it is available,
 * otherwise a random port is returned.
 * 
 * @param hostname The hostname to bind the port to. Default is "0.0.0.0", only
 * used when `prefer` is set and not `0`.
 */
export async function randomPort(
    prefer: number | undefined = undefined,
    hostname: string | undefined = undefined
): Promise<number> {
    hostname ||= "0.0.0.0";
    if (isDeno) {
        try {
            const listener = Deno.listen({
                hostname,
                port: prefer ?? 0,
            });
            const { port } = listener.addr as Deno.NetAddr;
            listener.close();
            return Promise.resolve(port);
        } catch (err) {
            if (prefer) {
                return randomPort(0);
            } else {
                throw err;
            }
        }
    } else if (isBun) {
        try {
            const listener = Bun.listen({
                hostname,
                port: prefer ?? 0,
                socket: {
                    data: () => { },
                },
            }) as { port: number; stop: (force?: boolean) => void; };
            const { port } = listener;
            listener.stop(true);
            return Promise.resolve(port);
        } catch (err) {
            if (prefer) {
                return randomPort(0);
            } else {
                throw err;
            }
        }
    } else if (isNode) {
        const { createServer, connect } = await import("node:net");

        if (prefer) {
            // In Node.js listening on a port used by another process may work,
            // so we don't use `listen` method to check if the port is available.
            // Instead, we use the `connect` method to check if the port can be
            // reached, if so, the port is open and we don't use it.
            const isOpen = await new Promise<boolean>((resolve, reject) => {
                const conn = connect(prefer, hostname === "0.0.0.0" ? "localhost" : hostname);
                conn.once("connect", () => {
                    conn.end();
                    resolve(true);
                }).once("error", (err) => {
                    if ((err as any)["code"] === "ECONNREFUSED") {
                        resolve(false);
                    } else {
                        reject(err);
                    }
                });
            });

            if (isOpen) {
                return randomPort(0);
            } else {
                return prefer;
            }
        } else {
            const server = createServer();
            server.listen({ port: 0, exclusive: true });
            const port = (server.address() as any).port as number;

            return new Promise<number>((resolve, reject) => {
                server.close(err => err ? reject(err) : resolve(port));
            });
        }
    } else {
        throw new Error("Unsupported runtime");
    }
}

/**
 * This function provides a unified interface to connect to a TCP server in
 * Node.js, Deno, Bun and Cloudflare Workers, with modern Web APIs.
 * 
 * NOTE: This module depends on the Web Streams API, in Node.js, it requires
 * Node.js v18.0 or above.
 * 
 * @example
 * ```ts
 * import bytes from "@ayonli/jsext/bytes";
 * import { readAsText } from "@ayonli/jsext/reader";
 * import { connect } from "@ayonli/jsext/net";
 * 
 * const socket = await connect({ hostname: "example.com", port: 80 });
 * const writer = socket.writable.getWriter();
 * 
 * await writer.write(bytes("GET / HTTP/1.1\r\n"));
 * await writer.write(bytes("Accept: plain/html\r\n"));
 * await writer.write(bytes("Host: example.com\r\n"));
 * await writer.write(bytes("\r\n"));
 * await writer.close();
 * 
 * const message = await readAsText(socket.readable);
 * console.log(message);
 * ```
 */
export async function connect(options: ConnectOptions): Promise<Socket> {
    const { tls = false, ..._options } = options;

    if (isDeno) {
        const _socket = tls
            ? await Deno.connectTls(_options)
            : await Deno.connect(_options);
        const localAddr = _socket.localAddr as Deno.NetAddr;
        const remoteAddr = _socket.remoteAddr as Deno.NetAddr;
        const closed = asyncTask<void>();
        let closeCalled = false;

        return new Socket({
            localAddress: constructNetAddress({
                hostname: localAddr.hostname,
                port: localAddr.port,
            }),
            remoteAddress: constructNetAddress({
                hostname: remoteAddr.hostname,
                port: remoteAddr.port,
            }),
            readable: new ReadableStream<Uint8Array>({
                async pull(controller) {
                    try {
                        while (true) {
                            const value = new Uint8Array(4096);
                            const n = await _socket.read(value);

                            if (n === null) {
                                try { controller.close(); } catch { }
                                closed.resolve();
                                break;
                            }

                            controller.enqueue(value.subarray(0, n));
                        }
                    } catch (err) {
                        closeCalled ? closed.resolve() : closed.reject(err);
                    }
                },
                cancel(reason) {
                    reason ? closed.reject(reason) : closed.resolve();
                    return _socket.close();
                },
            }),
            writable: new WritableStream<Uint8Array>({
                async write(chunk) {
                    await _socket.write(chunk);
                },
                async close() {
                    await _socket.closeWrite();
                },
            }),
            closed,
            close: async () => {
                closeCalled = true;
                _socket.close();
                await closed;
            },
            ref: _socket.ref.bind(_socket),
            unref: _socket.unref.bind(_socket),
        });
    } else if (isBun) {
        const ready = asyncTask<void>();
        const closed = asyncTask<void>();
        let readCtrl: ReadableStreamDefaultController<Uint8Array> | null = null;
        let writeCtrl: WritableStreamDefaultController | null = null;

        const readable = new ReadableStream<Uint8Array>({
            start(controller) {
                readCtrl = controller;
            },
            cancel(reason) {
                reason ? closed.reject(reason) : closed.resolve();
                _socket.end();
            },
        });
        const writable = new WritableStream<Uint8Array>({
            start(controller) {
                writeCtrl = controller;
            },
            write(chunk) {
                _socket.write(chunk);
            },
            close() {
                _socket.shutdown();
            },
        });

        const _socket = await Bun.connect({
            ..._options,
            tls,
            socket: {
                binaryType: "uint8array",
                open() {
                    ready.resolve();
                },
                data(_socket, data: Uint8Array) {
                    readCtrl!.enqueue(data);
                },
                error(_socket, error) {
                    try { readCtrl!.error(error); } catch { }
                    try { writeCtrl!.error(error); } catch { }
                    closed.reject(error);
                },
                close() {
                    try { readCtrl!.close(); } catch { }
                    try { writeCtrl!.error(); } catch { }
                    closed.resolve();
                },
            }
        });

        await ready;

        return new Socket({
            localAddress: constructNetAddress({
                hostname: "localhost",
                port: _socket.localPort,
            }),
            remoteAddress: constructNetAddress({
                hostname: _socket.remoteAddress,
                port: options.port,
            }),
            readable,
            writable,
            closed,
            close: async () => {
                _socket.end();
                await closed;
            },
            ref: () => _socket.ref(),
            unref: () => _socket.unref(),
        });
    } else if (isNode) {
        const { createConnection } = await import("node:net");
        const { connect } = await import("node:tls");

        const ready = asyncTask<void>();
        const closed = asyncTask<void>();
        let readCtrl: ReadableStreamDefaultController<Uint8Array> | null = null;
        let writeCtrl: WritableStreamDefaultController | null = null;

        const readable = new ReadableStream<Uint8Array>({
            start(controller) {
                readCtrl = controller;
            },
            cancel(reason) {
                _socket.destroy(reason);
            },
        });
        const writable = new WritableStream<Uint8Array>({
            start(controller) {
                writeCtrl = controller;
            },
            write(chunk) {
                _socket.write(chunk);
            },
            async close() {
                return new Promise<void>(resolve => {
                    _socket.end(resolve);
                });
            },
        });

        const _socket = tls
            ? connect({
                ..._options,
                rejectUnauthorized: false,
            })
            : createConnection({
                host: options.hostname,
                port: options.port,
                localPort: 0,
            });
        _socket.once("connect", () => {
            ready.resolve();
        }).on("data", data => {
            readCtrl!.enqueue(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
        }).once("error", (error) => {
            try { readCtrl!.error(error); } catch { }
            try { writeCtrl!.error(error); } catch { }
            closed.reject(error);
            ready.reject(error);
        }).once("close", (hasError) => {
            if (!hasError) {
                try { readCtrl!.close(); } catch { }
                try { writeCtrl!.error(); } catch { }
                closed.resolve();
            }
        });

        await ready;

        return new Socket({
            localAddress: constructNetAddress({
                hostname: _socket.localAddress || "localhost",
                port: _socket.localPort ?? 0,
            }),
            remoteAddress: constructNetAddress({
                hostname: _socket.remoteAddress!,
                port: _socket.remotePort!,
            }),
            readable,
            writable,
            closed,
            close: async () => {
                _socket.destroy();
                await closed;
            },
            ref: () => _socket.ref(),
            unref: () => _socket.unref(),
        });
    } else {
        throw new Error("Unsupported runtime");
    }
}
