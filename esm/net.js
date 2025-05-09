import { asyncTask } from './async.js';
import { isNodeLike, isDeno, isBun, isNode } from './env.js';
import { throwUnsupportedRuntimeError } from './error.js';
import { TcpSocketStream, UnixSocketStream, UdpSocket, UdpSocketStream } from './net/types.js';
import { getInternetIp } from './net/util.js';
import chan from './chan.js';

/**
 * Functions for working with the network, such as connecting to a TCP server,
 * binding a UDP socket, etc.
 *
 * This module is designed to provide a unified interface to work with network
 * in Node.js, Deno, Bun (and Cloudflare Workers for limited support), based on
 * modern Web APIs. It does not work in the browser.
 *
 * NOTE: This module depends on the Web Streams API, in Node.js, it requires
 * Node.js v18.0 or above.
 * @module
 * @experimental
 */
/**
 * Returns the IP address of the current machine.
 *
 * NOTE: This function may return the IP address of the local network or the
 * public IP address, depending on the environment and network configuration.
 * If the public IP address is intended, use {@link getInternetIp} instead.
 */
async function getMyIp() {
    if (isNodeLike) {
        const { createSocket } = await import('node:dgram');
        const socket = createSocket("udp4");
        return new Promise((resolve) => {
            socket.connect(53, "8.8.8.8", () => {
                const addr = socket.address();
                socket.close();
                resolve(addr.address);
            });
        });
    }
    else if (isDeno) {
        const conn = await Deno.connect({
            hostname: "8.8.8.8",
            port: 53,
        });
        const addr = conn.localAddr;
        conn.close();
        return addr.hostname;
    }
    else if (typeof fetch === "function") {
        try {
            return await getInternetIp();
        }
        catch (_a) {
            // ignore
        }
    }
    throwUnsupportedRuntimeError();
}
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
        throwUnsupportedRuntimeError();
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
    if (isNode) {
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
        return new TcpSocketStream({
            localAddress: {
                hostname: _socket.localAddress || "localhost",
                port: (_a = _socket.localPort) !== null && _a !== void 0 ? _a : 0,
            },
            remoteAddress: {
                hostname: _socket.remoteAddress,
                port: _socket.remotePort,
            },
            ...props,
            setKeepAlive: _socket.setKeepAlive.bind(_socket),
            setNoDelay: _socket.setNoDelay.bind(_socket),
        });
    }
    else if (isDeno) {
        const _socket = tls
            ? await Deno.connectTls(_options)
            : await Deno.connect(_options);
        const { localAddr, remoteAddr } = _socket;
        return new TcpSocketStream({
            localAddress: {
                hostname: localAddr.hostname,
                port: localAddr.port,
            },
            remoteAddress: {
                hostname: remoteAddr.hostname,
                port: remoteAddr.port,
            },
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
        const closeStreams = () => {
            try {
                _socket.terminate();
            }
            catch (_a) { }
            try {
                readCtrl === null || readCtrl === void 0 ? void 0 : readCtrl.close();
            }
            catch (_b) { }
            try {
                writeCtrl === null || writeCtrl === void 0 ? void 0 : writeCtrl.error(new TypeError("The stream is closed."));
            }
            catch (_c) { }
        };
        const readable = new ReadableStream({
            start(controller) {
                readCtrl = controller;
            },
            cancel(reason) {
                reason ? closed.reject(reason) : closed.resolve();
                closeStreams();
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
                writeCtrl.error(new TypeError("The stream is closed."));
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
                    closeStreams();
                    closed.resolve();
                },
            }
        });
        await ready;
        return new TcpSocketStream({
            localAddress: {
                hostname: "localhost",
                port: _socket.localPort,
            },
            remoteAddress: {
                hostname: _socket.remoteAddress,
                port: options.port,
            },
            readable,
            writable,
            closed,
            close: closeStreams,
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
    else {
        throwUnsupportedRuntimeError();
    }
}
async function connectUnix(options) {
    const { path } = options;
    if (isNode) {
        const { createConnection } = await import('node:net');
        const _socket = createConnection({ path });
        const props = await nodeToSocket(_socket);
        return new UnixSocketStream(props);
    }
    else if (isDeno) {
        const _socket = await Deno.connect({ transport: "unix", path });
        return new UnixSocketStream(denoToSocket(_socket));
    }
    else if (isBun) {
        const ready = asyncTask();
        const closed = asyncTask();
        let readCtrl = null;
        let writeCtrl = null;
        const closeStreams = () => {
            try {
                _socket.terminate();
            }
            catch (_a) { }
            try {
                readCtrl === null || readCtrl === void 0 ? void 0 : readCtrl.close();
            }
            catch (_b) { }
            try {
                writeCtrl === null || writeCtrl === void 0 ? void 0 : writeCtrl.error(new TypeError("The stream is closed."));
            }
            catch (_c) { }
        };
        const readable = new ReadableStream({
            start(controller) {
                readCtrl = controller;
            },
            cancel(reason) {
                reason ? closed.reject(reason) : closed.resolve();
                closeStreams();
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
                    closeStreams();
                    closed.resolve();
                },
            }
        });
        await ready;
        return new UnixSocketStream({
            readable,
            writable,
            closed,
            close: closeStreams,
            ref: () => _socket.ref(),
            unref: () => _socket.unref(),
        });
    }
    else {
        throwUnsupportedRuntimeError();
    }
}
async function nodeToSocket(socket) {
    const ready = asyncTask();
    const closed = asyncTask();
    let readCtrl = null;
    let writeCtrl = null;
    const closeStreams = () => {
        try {
            socket.destroyed || socket.destroy();
        }
        catch (_a) { }
        try {
            readCtrl === null || readCtrl === void 0 ? void 0 : readCtrl.close();
        }
        catch (_b) { }
        try {
            writeCtrl === null || writeCtrl === void 0 ? void 0 : writeCtrl.error(new TypeError("The stream is closed."));
        }
        catch (_c) { }
    };
    const readable = new ReadableStream({
        start(controller) {
            readCtrl = controller;
        },
        cancel(reason) {
            reason ? closed.reject(reason) : closed.resolve();
            closeStreams();
        },
    });
    const writable = new WritableStream({
        start(controller) {
            writeCtrl = controller;
        },
        write(chunk) {
            return new Promise((resolve, reject) => {
                socket.write(chunk, err => {
                    err ? reject(err) : resolve();
                });
            });
        },
        close() {
            return new Promise(resolve => {
                socket.end(resolve);
            });
        },
    });
    socket.once("connect", () => {
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
            closeStreams();
            closed.resolve();
        }
    });
    await ready;
    return {
        readable,
        writable,
        closed,
        close: () => void socket.destroy(),
        ref: () => void socket.ref(),
        unref: () => void socket.unref(),
    };
}
function denoToSocket(socket) {
    const closed = asyncTask();
    let closeCalled = false;
    let readCtrl = null;
    let writeCtrl = null;
    const closeStreams = () => {
        try {
            socket.close();
        }
        catch (_a) { }
        try {
            readCtrl === null || readCtrl === void 0 ? void 0 : readCtrl.close();
        }
        catch (_b) { }
        try {
            writeCtrl === null || writeCtrl === void 0 ? void 0 : writeCtrl.error(new TypeError("The stream is closed."));
        }
        catch (_c) { }
    };
    return {
        readable: new ReadableStream({
            start(controller) {
                readCtrl = controller;
            },
            async pull(readCtrl) {
                try {
                    while (true) {
                        const value = new Uint8Array(4096);
                        const n = await socket.read(value);
                        if (n === null) {
                            closeStreams();
                            closed.resolve();
                            break;
                        }
                        readCtrl.enqueue(value.subarray(0, n));
                    }
                }
                catch (err) {
                    try {
                        socket.close();
                    }
                    catch (_a) { }
                    try {
                        readCtrl.error(err);
                    }
                    catch (_b) { }
                    try {
                        writeCtrl === null || writeCtrl === void 0 ? void 0 : writeCtrl.error(err);
                    }
                    catch (_c) { }
                    closeCalled ? closed.resolve() : closed.reject(err);
                }
            },
            cancel(reason) {
                reason ? closed.reject(reason) : closed.resolve();
                closeStreams();
            },
        }),
        writable: new WritableStream({
            start(controller) {
                writeCtrl = controller;
            },
            async write(chunk) {
                await socket.write(chunk);
            },
            close() {
                return socket.closeWrite();
            },
        }),
        closed,
        close: () => {
            closeCalled = true;
            closeStreams();
        },
        ref: socket.ref.bind(socket),
        unref: socket.unref.bind(socket),
    };
}
async function connectUdp(remoteAddress) {
    const socket = await udpSocket();
    return socket.connect(remoteAddress);
}
/**
 * This function provides a unified interface to bind a UDP socket in Node.js,
 * Deno and Bun, based on modern Web APIs.
 *
 * NOTE: This function depends on the Web Streams API, in Node.js, it requires
 * Node.js v18.0 or above.
 *
 * @example
 * ```ts
 * import { udpSocket } from "@ayonli/jsext/net";
 *
 * const socket = await udpSocket({ port: 8080 });
 *
 * for await (const [data, addr] of socket) {
 *     console.log(`Received ${data.byteLength} bytes from ${addr.hostname}:${addr.port}`);
 * }
 * ```
 */
async function udpSocket(localAddress = {}) {
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
    //         close: _socket.close.bind(_socket),
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
        let isConnected = false;
        let isClosed = false;
        const closed = asyncTask();
        const channel = chan(Infinity);
        await new Promise(resolve => {
            _socket.bind(localAddress.port, localAddress.hostname, resolve);
        });
        _socket.on("message", (data, rinfo) => {
            channel.send([new Uint8Array(data.buffer, data.byteOffset, data.byteLength), {
                    hostname: rinfo.address,
                    port: rinfo.port,
                }]).catch(() => { });
        }).once("error", err => {
            channel.close(err);
            closed.reject(err);
        }).once("close", () => {
            isClosed = true;
            channel.close();
            closed.resolve();
        });
        const localAddr = _socket.address();
        const props = {
            localAddress: {
                hostname: localAddr.address,
                port: localAddr.port,
            },
            closed,
            close: () => void _socket.close(),
            ref: _socket.ref.bind(_socket),
            unref: _socket.unref.bind(_socket),
        };
        const checkState = () => {
            if (isConnected) {
                throw new TypeError("The socket is connected.");
            }
            else if (isClosed) {
                throw new TypeError("The socket is closed.");
            }
        };
        return new UdpSocket({
            ...props,
            joinMulticast: _socket.addMembership.bind(_socket),
            leaveMulticast: _socket.dropMembership.bind(_socket),
            setBroadcast: _socket.setBroadcast.bind(_socket),
            setMulticastLoopback: _socket.setMulticastLoopback.bind(_socket),
            setMulticastTTL: _socket.setMulticastTTL.bind(_socket),
            setTTL: _socket.setTTL.bind(_socket),
            receive: async () => {
                checkState();
                const msg = await channel.recv();
                if (msg) {
                    return msg;
                }
                else {
                    throw new TypeError("The socket is closed.");
                }
            },
            send: async (data, remoteAddress) => {
                checkState();
                return new Promise((resolve, reject) => {
                    _socket.send(data, remoteAddress.port, remoteAddress.hostname, (err, n) => {
                        err ? reject(err) : resolve(n);
                    });
                });
            },
            connect: (remoteAddress) => {
                return new Promise(resolve => {
                    isConnected = true;
                    _socket.connect(remoteAddress.port, remoteAddress.hostname, () => {
                        const localAddr = _socket.address();
                        const remoteAddr = _socket.remoteAddress();
                        let readCtrl = null;
                        let writeCtrl = null;
                        const closeStreams = () => {
                            channel.close();
                            try {
                                _socket.close();
                            }
                            catch (_a) { }
                            try {
                                readCtrl === null || readCtrl === void 0 ? void 0 : readCtrl.close();
                            }
                            catch (_b) { }
                            try {
                                writeCtrl === null || writeCtrl === void 0 ? void 0 : writeCtrl.error(new TypeError("The stream is closed."));
                            }
                            catch (_c) { }
                        };
                        resolve(new UdpSocketStream({
                            ...props,
                            localAddress: {
                                hostname: localAddr.address,
                                port: localAddr.port,
                            },
                            remoteAddress: {
                                hostname: remoteAddr.address,
                                port: remoteAddr.port,
                            },
                            readable: new ReadableStream({
                                start(controller) {
                                    readCtrl = controller;
                                },
                                async pull(readCtrl) {
                                    try {
                                        while (true) {
                                            const msg = await channel.recv();
                                            if (msg === undefined) {
                                                closeStreams();
                                                closed.resolve();
                                                break;
                                            }
                                            readCtrl.enqueue(msg[0]);
                                        }
                                    }
                                    catch (err) {
                                        channel.close(err);
                                        try {
                                            _socket.close();
                                        }
                                        catch (_a) { }
                                        try {
                                            readCtrl.error(err);
                                        }
                                        catch (_b) { }
                                        try {
                                            writeCtrl === null || writeCtrl === void 0 ? void 0 : writeCtrl.error(err);
                                        }
                                        catch (_c) { }
                                        isClosed ? closed.resolve() : closed.reject(err);
                                    }
                                },
                                cancel(reason) {
                                    reason ? closed.reject(reason) : closed.resolve();
                                    closeStreams();
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
                            }),
                        }));
                    });
                });
            },
        });
    }
    else {
        throwUnsupportedRuntimeError();
    }
}

export { connect, getInternetIp, getMyIp, randomPort, udpSocket };
//# sourceMappingURL=net.js.map
