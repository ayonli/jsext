const _impl = Symbol.for("impl");
/**
 * A socket represents an open transport to a remote peer.
 */
class Socket {
    constructor(impl) {
        this[_impl] = impl;
    }
    /**
     * A promise that resolves when the socket is closed, or rejects if the socket
     * is closed with an error.
     */
    get closed() {
        return this[_impl].closed;
    }
    /**
     * Closes both the readable and writable sides of the socket.
     */
    close() {
        return this[_impl].close();
    }
    /**
     * Opposite of `unref()`, calling `ref()` on a previously unrefed socket will
     * not let the program exit if it's the only socket left (the default behavior).
     * If the socket is refed calling `ref()` again will have no effect.
     *
     * NOTE: This function only works in Node.js, Deno and Bun, it is a no-op in
     * other environments.
     */
    ref() {
        return this[_impl].ref();
    }
    /**
     * Calling `unref()` on a socket will allow the program to exit if this is
     * the only active socket in the event system. If the socket is already
     * unrefed calling `unref()` again will have no effect.
     *
     * NOTE: This function only works in Node.js, Deno and Bun, it is a no-op in
     * other environments.
     */
    unref() {
        return this[_impl].unref();
    }
}
/**
 * A socket stream represents a connection to a remote peer with a `readable`
 * stream and a `writable` stream.
 */
class SocketStream extends Socket {
    constructor(impl) {
        super(impl);
        this[_impl] = impl;
    }
    /**
     * The readable side of the socket.
     */
    get readable() {
        return this[_impl].readable;
    }
    /**
     * The writable side of the socket.
     */
    get writable() {
        return this[_impl].writable;
    }
}
class TcpSocketStream extends SocketStream {
    constructor(impl) {
        super(impl);
        this[_impl] = impl;
    }
    get localAddress() {
        var _a;
        return (_a = this[_impl].localAddress) !== null && _a !== void 0 ? _a : null;
    }
    get remoteAddress() {
        var _a;
        return (_a = this[_impl].remoteAddress) !== null && _a !== void 0 ? _a : null;
    }
    /**
     * Enable/disable keep-alive functionality.
     *
     * NOTE: This function is a no-op in Cloudflare Workers and Deno with TLS enabled.
     */
    setKeepAlive(keepAlive = undefined) {
        return this[_impl].setKeepAlive(keepAlive);
    }
    /**
     * Enable/disable the use of Nagle's algorithm.
     *
     * NOTE: This function is a no-op in Cloudflare Workers and Deno with TLS enabled.
     */
    setNoDelay(noDelay = undefined) {
        return this[_impl].setNoDelay(noDelay);
    }
}
class UnixSocketStream extends SocketStream {
}
class UdpSocket extends Socket {
    constructor(impl) {
        super(impl);
        this[_impl] = impl;
    }
    get localAddress() {
        return this[_impl].localAddress;
    }
    receive() {
        return this[_impl].receive();
    }
    send(data, to) {
        return this[_impl].send(data, to);
    }
    /**
     * Connects the socket to a remote peer so that future communications will
     * only be with that peer.
     *
     * This function returns a `UdpSocketStream` instance that comes with a
     * `readable` stream and a `writable` stream, which gives a more convenient
     * interface that is similar to TCP sockets.
     *
     * Once connected, the `send` and `receive` methods of the original socket
     * will be disabled.
     */
    connect(to) {
        return this[_impl].connect(to);
    }
}
class UdpSocketStream extends Socket {
    constructor(impl) {
        super(impl);
        this[_impl] = impl;
    }
    get localAddress() {
        return this[_impl].localAddress;
    }
    get remoteAddress() {
        return this[_impl].remoteAddress;
    }
    get readable() {
        return this[_impl].readable;
    }
    get writable() {
        return this[_impl].writable;
    }
}

export { Socket, SocketStream, TcpSocketStream, UdpSocket, UdpSocketStream, UnixSocketStream };
//# sourceMappingURL=types.js.map
