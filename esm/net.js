import { asyncTask } from './async.js';
import { isDeno, isBun, isNode, isNodeLike } from './env.js';
import { TcpSocketStream, UnixSocketStream, UdpSocket, UdpSocketStream } from './net/types.js';
import { constructNetAddress } from './net/util.js';
import chan from './chan.js';

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
    if (options.transport === "udp") {
        return connectUdp(options);
    }
    else if (options.transport === "unix" || "path" in options) {
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
        const { localAddr, remoteAddr } = _socket;
        return new TcpSocketStream({
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
        return new TcpSocketStream({
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
        const socket = new TcpSocketStream({
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
        return new UnixSocketStream(denoToSocket(_socket));
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
        return new UnixSocketStream({
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
        const socket = new UnixSocketStream(props);
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
async function connectUdp(remoteAddress) {
    const socket = await bindUdp();
    return socket.connect(remoteAddress);
}
/**
 * This function provides a unified interface to bind a UDP socket in Node.js,
 * Deno and Bun, based on modern Web APIs.
 *
 * NOTE: This module depends on the Web Streams API, in Node.js, it requires
 * Node.js v18.0 or above.
 */
async function bindUdp(localAddress = {}) {
    // if (isDeno) {
    //     const _socket = Deno.listenDatagram({
    //         hostname: localAddress.hostname ?? "0.0.0.0",
    //         port: localAddress.port ?? 0,
    //         transport: "udp",
    //     });
    //     const addr = _socket.addr as Deno.NetAddr;
    //     const closed = asyncTask<void>();
    var _a;
    //     return new UdpSocket({
    //         localAddress: constructNetAddress({
    //             hostname: addr.hostname,
    //             port: addr.port,
    //         }),
    //         closed,
    //         close: async () => {
    //             _socket.close();
    //             await closed;
    //         },
    //         ref: () => void 0,
    //         unref: () => void 0,
    //         receive: async () => {
    //             try {
    //                 const [data, addr] = await _socket.receive();
    //                 return [data, {
    //                     hostname: (addr as Deno.NetAddr).hostname,
    //                     port: (addr as Deno.NetAddr).port,
    //                 }];
    //             } catch (err) {
    //                 closed.reject(err);
    //                 try { _socket.close(); } catch { }
    //                 throw err;
    //             }
    //         },
    //         send: (data, remoteAddress) => {
    //             return _socket.send(data, { transport: "udp", ...remoteAddress });
    //         },
    //         connect: (remoteAddress) => {
    //             void remoteAddress;
    //             throw new Error("Deno does not support UDP connection at the moment");
    //         },
    //     });
    // } else if (isNodeLike) {
    if (isDeno || isNodeLike) {
        const { createSocket } = await import('node:dgram');
        const _socket = createSocket(((_a = localAddress.hostname) === null || _a === void 0 ? void 0 : _a.includes(":")) ? "udp6" : "udp4");
        let connected = false;
        const closed = asyncTask();
        const channel = chan();
        await new Promise(resolve => {
            _socket.bind(localAddress.port, localAddress.hostname, resolve);
        });
        _socket.once("message", (data, rinfo) => {
            channel.send([new Uint8Array(data.buffer, data.byteOffset, data.byteLength), {
                    hostname: rinfo.address,
                    port: rinfo.port,
                }]).catch(() => { });
        }).once("error", err => {
            channel.close(err);
            closed.reject(err);
        }).once("close", () => {
            channel.close();
            closed.resolve();
        });
        const localAddr = _socket.address();
        const props = {
            localAddress: constructNetAddress({
                hostname: localAddr.address,
                port: localAddr.port,
            }),
            closed,
            close: () => new Promise(resolve => _socket.close(resolve)),
            ref: _socket.ref.bind(_socket),
            unref: _socket.unref.bind(_socket),
        };
        return new UdpSocket({
            ...props,
            receive: async () => {
                if (connected) {
                    throw new Error("Socket is connected");
                }
                const msg = await channel.recv();
                if (msg) {
                    return msg;
                }
                else {
                    throw new Error("Socket is closed");
                }
            },
            send: (data, remoteAddress) => {
                if (connected) {
                    throw new Error("Socket is connected");
                }
                return new Promise((resolve, reject) => {
                    _socket.send(data, remoteAddress.port, remoteAddress.hostname, (err, n) => {
                        err ? reject(err) : resolve(n);
                    });
                });
            },
            connect: (remoteAddress) => {
                return new Promise(resolve => {
                    connected = true;
                    channel.close(new Error("Socket is connected"));
                    _socket.removeAllListeners("message");
                    _socket.connect(remoteAddress.port, remoteAddress.hostname, () => {
                        const localAddr = _socket.address();
                        const remoteAddr = _socket.remoteAddress();
                        let writeCtrl = null;
                        resolve(new UdpSocketStream({
                            ...props,
                            localAddress: constructNetAddress({
                                hostname: localAddr.address,
                                port: localAddr.port,
                            }),
                            remoteAddress: constructNetAddress({
                                hostname: remoteAddr.address,
                                port: remoteAddr.port,
                            }),
                            readable: new ReadableStream({
                                start(controller) {
                                    _socket.on("message", (data, _rinfo) => {
                                        controller.enqueue(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
                                    });
                                },
                                cancel() {
                                    _socket.close();
                                },
                            }),
                            writable: new WritableStream({
                                start(controller) {
                                    writeCtrl = controller;
                                },
                                write(chunk) {
                                    return new Promise((resolve, reject) => {
                                        _socket.send(chunk, err => {
                                            err ? reject(err) : resolve();
                                        });
                                    });
                                },
                                close() {
                                    writeCtrl.error();
                                },
                                abort(reason) {
                                    writeCtrl === null || writeCtrl === void 0 ? void 0 : writeCtrl.error(reason);
                                },
                            }),
                        }));
                    });
                });
            },
        });
    }
    else {
        throw new Error("Unsupported runtime");
    }
}

export { bindUdp, connect, randomPort };
//# sourceMappingURL=net.js.map
