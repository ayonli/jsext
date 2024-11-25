const _impl = Symbol.for("impl");
/**
 * A socket represents a network connection, currently only supports TCP.
 */
class Socket {
    constructor(impl) {
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
     */
    ref() {
        return this[_impl].ref();
    }
    /**
     * Calling `unref()` on a socket will allow the program to exit if this is
     * the only active socket in the event system. If the socket is already
     * unrefed calling `unref()` again will have no effect.
     */
    unref() {
        return this[_impl].unref();
    }
}
class TcpSocket extends Socket {
    constructor(impl) {
        super(impl);
        this[_impl] = impl;
    }
    setKeepAlive(keepAlive = undefined) {
        return this[_impl].setKeepAlive(keepAlive);
    }
    setNoDelay(noDelay = undefined) {
        return this[_impl].setNoDelay(noDelay);
    }
}
class UnixSocket extends Socket {
    constructor(impl) {
        super(impl);
        this[_impl] = impl;
    }
}

export { Socket, TcpSocket, UnixSocket };
//# sourceMappingURL=types.js.map
