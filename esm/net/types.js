const _impl = Symbol.for("impl");
/**
 * A socket represents an open transport to a remote peer.
 */
class Socket {
    constructor(impl) {
        this[_impl] = impl;
    }
    /**
     * A promise that resolves when the socket is closed cleanly, or rejects if
     * the closed with an error.
     */
    get closed() {
        return this[_impl].closed;
    }
    /**
     * Closes the socket immediately, if there are any queued data, they will be
     * discarded.
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
    [Symbol.dispose]() {
        return this.close();
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
        return this[_impl].localAddress;
    }
    get remoteAddress() {
        return this[_impl].remoteAddress;
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
    /**
     * Receives a message from the socket, returns the data and the sender
     * address in a tuple.
     */
    receive() {
        return this[_impl].receive();
    }
    /**
     * Sends a message to the specified receiver, returns the number of bytes
     * sent.
     *
     * NOTE: UDP messages have size limits, see
     * https://nodejs.org/docs/latest/api/dgram.html#note-about-udp-datagram-size.
     *
     */
    send(data, receiver) {
        return this[_impl].send(data, receiver);
    }
    /**
     * Connects the socket to a remote peer so that future communications will
     * only be with that peer.
     *
     * This function returns a `UdpSocketStream` instance that comes with a
     * `readable` stream and a `writable` stream, which gives a more convenient
     * interface that is similar to TCP connections.
     *
     * Once connected, the `send` and `receive` methods of the original socket
     * will be disabled.
     */
    connect(to) {
        return this[_impl].connect(to);
    }
    /**
     * Tells the kernel to join a multicast group at the given `address` and
     * the optional `multicastInterface` using the `IP_ADD_MEMBERSHIP` socket
     * option.
     */
    joinMulticast(address, interfaceAddress = undefined) {
        return this[_impl].joinMulticast(address, interfaceAddress);
    }
    /**
     * Instructs the kernel to leave a multicast group at `address` using the
     * `IP_DROP_MEMBERSHIP` socket option.
     */
    leaveMulticast(address, interfaceAddress = undefined) {
        return this[_impl].leaveMulticast(address, interfaceAddress);
    }
    /**
     * Sets or clears the `SO_BROADCAST` socket option. When enabled, this
     * socket is allowed to send packets to a broadcast address.
     */
    setBroadcast(flag) {
        return this[_impl].setBroadcast(flag);
    }
    /**
     * Sets or clears the `IP_MULTICAST_LOOP` socket option. When enabled, this
     * socket will receive packets that it sends to the multicast group.
     */
    setMulticastLoopback(flag) {
        return this[_impl].setMulticastLoopback(flag);
    }
    /**
     * Sets the `IP_MULTICAST_TTL` socket option.
     *
     * See https://nodejs.org/docs/latest/api/dgram.html#socketsetmulticastttlttl
     */
    setMulticastTTL(ttl) {
        return this[_impl].setMulticastTTL(ttl);
    }
    /**
     * Sets the `IP_TTL` socket option
     *
     * See https://nodejs.org/docs/latest/api/dgram.html#socketsetttlttl
     */
    setTTL(ttl) {
        return this[_impl].setTTL(ttl);
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
