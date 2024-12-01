import type { connect, udpSocket } from "../net.ts";
import type { ToDict } from "../types.ts";

/**
 * Represents the network address of a connection peer.
 */
export interface NetAddress {
    /**
     * The hostname of the remote peer.
     */
    hostname: string;
    /**
     * The port number of the remote peer.
     */
    port: number;
}

/**
 * The options for {@link connect} to establish a TCP connection.
 */
export interface TcpConnectOptions extends NetAddress {
    transport?: "tcp";
    /**
     * Whether to enable TLS for the connection.
     */
    tls?: boolean;
};

/**
 * The options for {@link connect} to establish a Unix domain socket connection.
 */
export type UnixConnectOptions = {
    transport?: "unix";
    path: string;
};

/**
 * The options for {@link connect} to establish a UDP connection.
 */
export type UdpConnectOptions = NetAddress & {
    transport: "udp";
};

/**
 * The options for {@link udpSocket} to bind a UDP socket.
 */
export type UdpBindOptions = {
    /**
     * The hostname to be bound, if not provided, the system will try to listen
     * on all available addresses.
     */
    hostname?: string;
    /**
     * The port number to be bound, if not provided, the system will assign a
     * random port.
     */
    port?: number;
};

const _impl = Symbol.for("impl");

/**
 * A socket represents an open transport to a remote peer.
 */
export class Socket implements Disposable {
    protected [_impl]: ToDict<Socket>;

    constructor(impl: ToDict<Socket>) {
        this[_impl] = impl;
    }

    /**
     * A promise that resolves when the socket is closed cleanly, or rejects if
     * the closed with an error.
     */
    get closed(): Promise<void> {
        return this[_impl].closed;
    }

    /**
     * Closes the socket immediately, if there are any queued data, they will be
     * discarded.
     */
    close(): void {
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
    ref(): void {
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
    unref(): void {
        return this[_impl].unref();
    }

    [Symbol.dispose](): void {
        return this.close();
    }
}

/**
 * A socket stream represents a connection to a remote peer with a `readable`
 * stream and a `writable` stream.
 */
export class SocketStream extends Socket {
    protected override[_impl]: ToDict<SocketStream>;

    constructor(impl: ToDict<SocketStream>) {
        super(impl);
        this[_impl] = impl;
    }

    /**
     * The readable side of the socket.
     */
    get readable(): ReadableStream<Uint8Array> {
        return this[_impl].readable;
    }

    /**
     * The writable side of the socket.
     */
    get writable(): WritableStream<Uint8Array> {
        return this[_impl].writable;
    }
}

/**
 * A connection with TCP socket.
 */
export class TcpSocketStream extends SocketStream {
    protected override[_impl]: ToDict<TcpSocketStream>;

    constructor(impl: ToDict<TcpSocketStream>) {
        super(impl);
        this[_impl] = impl;
    }

    /**
     * The address of the local peer.
     */
    get localAddress(): NetAddress {
        return this[_impl].localAddress;
    }

    /**
     * The address of the remote peer.
     */
    get remoteAddress(): NetAddress {
        return this[_impl].remoteAddress;
    }

    /**
     * Enable/disable keep-alive functionality.
     * 
     * NOTE: This function is a no-op in Cloudflare Workers and Deno with TLS enabled.
     */
    setKeepAlive(keepAlive: boolean | undefined = undefined): void {
        return this[_impl].setKeepAlive(keepAlive);
    }

    /**
     * Enable/disable the use of Nagle's algorithm.
     * 
     * NOTE: This function is a no-op in Cloudflare Workers and Deno with TLS enabled.
     */
    setNoDelay(noDelay: boolean | undefined = undefined): void {
        return this[_impl].setNoDelay(noDelay);
    }
}

/**
 * A connection with Unix domain socket.
 */
export class UnixSocketStream extends SocketStream { }

/**
 * A UDP socket bound to a local address, with the ability to send and receive
 * messages.
 */
export class UdpSocket extends Socket implements AsyncIterable<[data: Uint8Array, sender: NetAddress]> {
    protected override[_impl]: ToDict<UdpSocket>;

    constructor(impl: ToDict<UdpSocket>) {
        super(impl);
        this[_impl] = impl;
    }

    /**
     * The address that this socket is bound to.
     */
    get localAddress(): NetAddress {
        return this[_impl].localAddress;
    }

    /**
     * Receives a message from the socket, returns the data and the sender
     * address in a tuple.
     */
    receive(): Promise<[data: Uint8Array, sender: NetAddress]> {
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
    send(data: Uint8Array, receiver: NetAddress): Promise<number> {
        return this[_impl].send(data, receiver);
    }

    /**
     * Associates the socket to a remote peer so that future communications will
     * only be with that peer.
     * 
     * This function returns a {@link UdpSocketStream} instance that comes with
     * a `readable` stream and a `writable` stream, which gives a more
     * convenient interface that is similar to TCP connections.
     * 
     * Once connected, the `send` and `receive` methods of the original socket
     * will be disabled.
     */
    connect(to: NetAddress): Promise<UdpSocketStream> {
        return this[_impl].connect(to);
    }

    /**
     * Tells the kernel to join a multicast group at the given `address` and
     * the optional `interfaceAddress` using the `IP_ADD_MEMBERSHIP` socket
     * option.
     */
    joinMulticast(address: string, interfaceAddress: string | undefined = undefined): void {
        return this[_impl].joinMulticast(address, interfaceAddress);
    }

    /**
     * Instructs the kernel to leave a multicast group at `address` using the
     * `IP_DROP_MEMBERSHIP` socket option. 
     */
    leaveMulticast(address: string, interfaceAddress: string | undefined = undefined): void {
        return this[_impl].leaveMulticast(address, interfaceAddress);
    }

    /**
     * Sets or clears the `SO_BROADCAST` socket option. When enabled, this
     * socket is allowed to send packets to a broadcast address.
     */
    setBroadcast(flag: boolean): void {
        return this[_impl].setBroadcast(flag);
    }

    /**
     * Sets or clears the `IP_MULTICAST_LOOP` socket option. When enabled, this
     * socket will receive packets that it sends to the multicast group.
     */
    setMulticastLoopback(flag: boolean): void {
        return this[_impl].setMulticastLoopback(flag);
    }

    /**
     * Sets the `IP_MULTICAST_TTL` socket option.
     * 
     * See https://nodejs.org/docs/latest/api/dgram.html#socketsetmulticastttlttl
     */
    setMulticastTTL(ttl: number): void {
        return this[_impl].setMulticastTTL(ttl);
    }

    /**
     * Sets the `IP_TTL` socket option
     * 
     * See https://nodejs.org/docs/latest/api/dgram.html#socketsetttlttl
     */
    setTTL(ttl: number): void {
        return this[_impl].setTTL(ttl);
    }

    async *[Symbol.asyncIterator](): AsyncIterableIterator<[data: Uint8Array, sender: NetAddress]> {
        while (true) {
            try {
                const msg = await this.receive();
                yield msg;
            } catch {
                break; // closed
            }
        }
    }
}

/**
 * A UDP socket stream represents a UDP socket that is bound to a local address
 * and associated to a remote address, the socket will only send and receive
 * messages to and from that remote address.
 * 
 * The instance of this class comes with a `readable` stream and a `writable`
 * stream, which gives a more convenient interface that is similar to TCP
 * connections.
 */
export class UdpSocketStream extends Socket {
    protected override[_impl]: ToDict<UdpSocketStream>;

    constructor(impl: ToDict<UdpSocketStream>) {
        super(impl);
        this[_impl] = impl;
    }

    /**
     * The address that this socket is bound to.
     */
    get localAddress(): NetAddress {
        return this[_impl].localAddress;
    }

    /**
     * The address of the remote peer.
     */
    get remoteAddress(): NetAddress {
        return this[_impl].remoteAddress;
    }

    /**
     * The readable side of the socket.
     */
    get readable(): ReadableStream<Uint8Array> {
        return this[_impl].readable;
    }

    /**
     * The writable side of the socket.
     */
    get writable(): WritableStream<Uint8Array> {
        return this[_impl].writable;
    }
}
