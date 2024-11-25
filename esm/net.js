import { asyncTask } from './async.js';
import { isDeno, isBun, isNode } from './env.js';
import { TcpSocket, UnixSocket } from './net/types.js';
import { constructNetAddress } from './net/util.js';

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
async function randomPort(prefer = undefined, hostname = undefined) {
    hostname || (hostname = "0.0.0.0");
    if (isDeno) {
        try {
            const listener = Deno.listen({
                hostname,
                port: prefer !== null && prefer !== void 0 ? prefer : 0,
            });
            const { port } = listener.addr;
            listener.close();
            return Promise.resolve(port);
        }
        catch (err) {
            if (prefer) {
                return randomPort(0);
            }
            else {
                throw err;
            }
        }
    }
    else if (isBun) {
        try {
            const listener = Bun.listen({
                hostname,
                port: prefer !== null && prefer !== void 0 ? prefer : 0,
                socket: {
                    data: () => { },
                },
            });
            const { port } = listener;
            listener.stop(true);
            return Promise.resolve(port);
        }
        catch (err) {
            if (prefer) {
                return randomPort(0);
            }
            else {
                throw err;
            }
        }
    }
    else if (isNode) {
        const { createServer, connect } = await import('node:net');
        if (prefer) {
            // In Node.js listening on a port used by another process may work,
            // so we don't use `listen` method to check if the port is available.
            // Instead, we use the `connect` method to check if the port can be
            // reached, if so, the port is open and we don't use it.
            const isOpen = await new Promise((resolve, reject) => {
                const conn = connect(prefer, hostname === "0.0.0.0" ? "localhost" : hostname);
                conn.once("connect", () => {
                    conn.end();
                    resolve(true);
                }).once("error", (err) => {
                    if (err["code"] === "ECONNREFUSED") {
                        resolve(false);
                    }
                    else {
                        reject(err);
                    }
                });
            });
            if (isOpen) {
                return randomPort(0);
            }
            else {
                return prefer;
            }
        }
        else {
            const server = createServer();
            server.listen({ port: 0, exclusive: true });
            const port = server.address().port;
            return new Promise((resolve, reject) => {
                server.close(err => err ? reject(err) : resolve(port));
            });
        }
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
function connect(options) {
    if ("path" in options) {
        return connectUnix(options);
    }
    else {
        return connectTcp(options);
    }
}
async function connectTcp(options) {
    var _a;
    const { tls = false, ..._options } = options;
    if (isDeno) {
        const _socket = tls
            ? await Deno.connectTls(_options)
            : await Deno.connect(_options);
        const localAddr = _socket.localAddr;
        const remoteAddr = _socket.remoteAddr;
        return new TcpSocket({
            localAddress: constructNetAddress({
                hostname: localAddr.hostname,
                port: localAddr.port,
            }),
            remoteAddress: constructNetAddress({
                hostname: remoteAddr.hostname,
                port: remoteAddr.port,
            }),
            ...denoToSocket(_socket),
            setKeepAlive: (keepAlive) => {
                if ("setKeepAlive" in _socket) {
                    _socket.setKeepAlive(keepAlive);
                }
            },
            setNoDelay: (noDelay) => {
                if ("setNoDelay" in _socket) {
                    _socket.setNoDelay(noDelay);
                }
            },
        });
    }
    else if (isBun) {
        const ready = asyncTask();
        const closed = asyncTask();
        let readCtrl = null;
        let writeCtrl = null;
        const readable = new ReadableStream({
            start(controller) {
                readCtrl = controller;
            },
            cancel(reason) {
                reason ? closed.reject(reason) : closed.resolve();
                _socket.end();
            },
        });
        const writable = new WritableStream({
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
                data(_socket, data) {
                    readCtrl.enqueue(data);
                },
                error(_socket, error) {
                    try {
                        readCtrl.error(error);
                    }
                    catch (_a) { }
                    try {
                        writeCtrl.error(error);
                    }
                    catch (_b) { }
                    closed.reject(error);
                },
                close() {
                    try {
                        readCtrl.close();
                    }
                    catch (_a) { }
                    try {
                        writeCtrl.error();
                    }
                    catch (_b) { }
                    closed.resolve();
                },
            }
        });
        await ready;
        return new TcpSocket({
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
            setKeepAlive: _socket.setKeepAlive.bind(_socket),
            setNoDelay: _socket.setNoDelay.bind(_socket),
        });
    }
    else if (isNode) {
        const { createConnection } = await import('node:net');
        const { connect } = await import('node:tls');
        const _socket = tls ? connect({
            ..._options,
            rejectUnauthorized: false,
        }) : createConnection({
            host: options.hostname,
            port: options.port,
            localPort: 0,
        });
        const props = await nodeToSocket(_socket);
        const socket = new TcpSocket({
            localAddress: constructNetAddress({
                hostname: _socket.localAddress || "localhost",
                port: (_a = _socket.localPort) !== null && _a !== void 0 ? _a : 0,
            }),
            remoteAddress: constructNetAddress({
                hostname: _socket.remoteAddress,
                port: _socket.remotePort,
            }),
            ...props,
            setKeepAlive: _socket.setKeepAlive.bind(_socket),
            setNoDelay: _socket.setNoDelay.bind(_socket),
        });
        return socket;
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
async function connectUnix(options) {
    const { path } = options;
    if (isDeno) {
        const _socket = await Deno.connect({ transport: "unix", path });
        const localAddr = _socket.localAddr;
        const remoteAddr = _socket.remoteAddr;
        return new UnixSocket({
            localAddress: {
                path: localAddr.path,
            },
            remoteAddress: {
                path: remoteAddr.path,
            },
            ...denoToSocket(_socket),
        });
    }
    else if (isBun) {
        const ready = asyncTask();
        const closed = asyncTask();
        let readCtrl = null;
        let writeCtrl = null;
        const readable = new ReadableStream({
            start(controller) {
                readCtrl = controller;
            },
            cancel(reason) {
                reason ? closed.reject(reason) : closed.resolve();
                _socket.end();
            },
        });
        const writable = new WritableStream({
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
            unix: path,
            socket: {
                binaryType: "uint8array",
                open() {
                    ready.resolve();
                },
                data(_socket, data) {
                    readCtrl.enqueue(data);
                },
                error(_socket, error) {
                    try {
                        readCtrl.error(error);
                    }
                    catch (_a) { }
                    try {
                        writeCtrl.error(error);
                    }
                    catch (_b) { }
                    closed.reject(error);
                },
                close() {
                    try {
                        readCtrl.close();
                    }
                    catch (_a) { }
                    try {
                        writeCtrl.error();
                    }
                    catch (_b) { }
                    closed.resolve();
                },
            }
        });
        await ready;
        return new UnixSocket({
            localAddress: {
                path: _socket.remoteAddress,
            },
            remoteAddress: {
                path: _socket.remoteAddress,
            },
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
    }
    else if (isNode) {
        const { createConnection } = await import('node:net');
        const _socket = createConnection({ path });
        const props = await nodeToSocket(_socket);
        const socket = new UnixSocket({
            localAddress: {
                path: _socket.localAddress,
            },
            remoteAddress: {
                path: _socket.remoteAddress,
            },
            ...props,
        });
        return socket;
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
function denoToSocket(socket) {
    const closed = asyncTask();
    let closeCalled = false;
    return {
        readable: new ReadableStream({
            async pull(controller) {
                try {
                    while (true) {
                        const value = new Uint8Array(4096);
                        const n = await socket.read(value);
                        if (n === null) {
                            try {
                                controller.close();
                            }
                            catch (_a) { }
                            closed.resolve();
                            break;
                        }
                        controller.enqueue(value.subarray(0, n));
                    }
                }
                catch (err) {
                    try {
                        controller.error(err);
                    }
                    catch (_b) { }
                    closeCalled ? closed.resolve() : closed.reject(err);
                }
            },
            cancel(reason) {
                reason ? closed.reject(reason) : closed.resolve();
                socket.close();
            },
        }),
        writable: new WritableStream({
            async write(chunk) {
                await socket.write(chunk);
            },
            close() {
                return socket.closeWrite();
            },
        }),
        closed,
        close: async () => {
            closeCalled = true;
            socket.close();
            await closed;
        },
        ref: socket.ref.bind(socket),
        unref: socket.unref.bind(socket),
    };
}
async function nodeToSocket(_socket) {
    const ready = asyncTask();
    const closed = asyncTask();
    let readCtrl = null;
    let writeCtrl = null;
    const readable = new ReadableStream({
        start(controller) {
            readCtrl = controller;
        },
        cancel(reason) {
            _socket.destroy(reason);
        },
    });
    const writable = new WritableStream({
        start(controller) {
            writeCtrl = controller;
        },
        write(chunk) {
            return new Promise((resolve, reject) => {
                _socket.write(chunk, err => {
                    err ? reject(err) : resolve();
                });
            });
        },
        close() {
            return new Promise(resolve => {
                _socket.end(resolve);
            });
        },
    });
    _socket.once("connect", () => {
        ready.resolve();
    }).on("data", data => {
        readCtrl.enqueue(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
    }).once("error", (error) => {
        try {
            readCtrl.error(error);
        }
        catch (_a) { }
        try {
            writeCtrl.error(error);
        }
        catch (_b) { }
        closed.reject(error);
        ready.reject(error);
    }).once("close", (hasError) => {
        if (!hasError) {
            try {
                readCtrl.close();
            }
            catch (_a) { }
            try {
                writeCtrl.error();
            }
            catch (_b) { }
            closed.resolve();
        }
    });
    await ready;
    return {
        readable,
        writable,
        closed,
        close: async () => {
            _socket.destroy();
            await closed;
        },
        ref: () => _socket.ref(),
        unref: () => _socket.unref(),
    };
}

export { connect, randomPort };
//# sourceMappingURL=net.js.map
