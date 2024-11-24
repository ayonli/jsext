import { asyncTask } from "./async.ts";
import { isBun, isDeno, isNode } from "./env.ts";
import { ConnectOptions, Socket } from "./net/types.ts";
import { constructNetAddress } from "./net/util.ts";

export * from "./net/types.ts";

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

export async function connect(options: ConnectOptions): Promise<Socket> {
    if (isDeno) {
        const createSocket = (
            impl: Deno.TcpConn | Deno.TlsConn,
            startTls: () => Promise<Socket>
        ) => {
            const reader = impl.readable.getReader();
            const closed = asyncTask<void>();
            const localAddr = impl.localAddr as Deno.NetAddr;
            const remoteAddr = impl.remoteAddr as Deno.NetAddr;

            return new Socket({
                localAddress: constructNetAddress({
                    family: localAddr.hostname.includes(":") ? "IPv6" : "IPv4",
                    hostname: localAddr.hostname,
                    port: localAddr.port,
                }),
                remoteAddress: constructNetAddress({
                    family: remoteAddr.hostname.includes(":") ? "IPv6" : "IPv4",
                    hostname: remoteAddr.hostname,
                    port: remoteAddr.port,
                }),
                readable: new ReadableStream<Uint8Array>({
                    async pull(controller) {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) {
                                try { controller.close(); } catch { }
                                closed.resolve();
                                break;
                            }

                            controller.enqueue(value);
                        }
                    },
                    async cancel(reason) {
                        await reader.cancel(reason);
                    },
                }),
                writable: impl.writable,
                closed,
                close: async () => {
                    impl.close();
                    await closed;
                },
                startTls,
                ref: impl.ref.bind(impl),
                unref: impl.unref.bind(impl),
            });
        };

        const _socket = await Deno.connect(options);
        return createSocket(_socket, async () => {
            const __socket = await Deno.startTls(_socket);
            return createSocket(__socket, async () => {
                throw new Error("TLS already started");
            });
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
        });
        const writable = new WritableStream<Uint8Array>({
            start(controller) {
                writeCtrl = controller;
            },
            write(chunk) {
                _socket.write(chunk);
            },
            close() {
                _socket.end();
            },
        });

        const _socket = await Bun.connect({
            ...options,
            hostname: options.hostname || "localhost",
            socket: {
                binaryType: "uint8array",
                open() {
                    ready.resolve();
                },
                data(_socket: any, data: Uint8Array | Buffer) {
                    readCtrl!.enqueue(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
                },
                close() {
                    readCtrl!.close();
                    writeCtrl!.error();
                    closed.resolve();
                },
                error(_socket: any, error: Error) {
                    readCtrl!.error(error);
                    writeCtrl!.error(error);
                    closed.reject(error);
                },
            }
        });

        await ready;

        return new Socket({
            localAddress: constructNetAddress({
                family: "IPv4",
                hostname: "localhost",
                port: _socket.localPort,
            }),
            remoteAddress: constructNetAddress({
                family: _socket.remoteAddress.includes(":") ? "IPv6" : "IPv4",
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
            startTls: async () => {
                throw new Error("TLS not supported");
            },
            ref: () => _socket.ref(),
            unref: () => _socket.unref(),
        });
    } else if (isNode) {
        const { createConnection } = await import("node:net");
        const ready = asyncTask<void>();
        const closed = asyncTask<void>();
        let readCtrl: ReadableStreamDefaultController<Uint8Array> | null = null;
        let writeCtrl: WritableStreamDefaultController | null = null;

        const readable = new ReadableStream<Uint8Array>({
            start(controller) {
                readCtrl = controller;
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
                _socket.end();
            },
        });

        const _socket = createConnection(options.port, options.hostname || "localhost");
        _socket.once("connect", () => {
            ready.resolve();
        }).on("data", data => {
            readCtrl!.enqueue(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
        }).once("error", (error) => {
            readCtrl!.error(error);
            writeCtrl!.error(error);
            closed.reject(error);
            ready.reject(error);
        }).once("close", (hasError) => {
            readCtrl!.close();
            writeCtrl!.error();
            hasError || closed.resolve();
        });

        await ready;

        return new Socket({
            localAddress: constructNetAddress({
                family: "IPv4",
                hostname: _socket.localAddress || "localhost",
                port: _socket.localPort ?? 0,
            }),
            remoteAddress: constructNetAddress({
                family: _socket.remoteFamily as "IPv4" | "IPv6",
                hostname: _socket.remoteAddress!,
                port: _socket.remotePort!,
            }),
            readable,
            writable,
            closed,
            close: async () => {
                _socket.end();
                await closed;
            },
            startTls: async () => {
                throw new Error("TLS not supported");
            },
            ref: () => _socket.ref(),
            unref: () => _socket.unref(),
        });
    } else {
        throw new Error("Unsupported runtime");
    }
}
