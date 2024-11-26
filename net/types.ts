import type { connect } from "../net.ts";
import { ToDict } from "../types.ts";

/**
 * Represents the network address of a connection peer.
 */
export interface NetAddress {
    family: "IPv4" | "IPv6";
    /**
     * @deprecated use `hostname` instead.
     */
    readonly address: string;
    /**
     * The hostname of the remote peer.
     */
    hostname: string;
    /**
     * The port number of the remote peer, or `0` if it's not available.
     */
    port: number;
}

/**
 * The options for {@link connect}.
 */
export interface ConnectOptions {
    transport?: "tcp";
    /**
     * The hostname of the remote peer.
     */
    hostname: string;
    /**
     * The port number of the remote peer.
     */
    port: number;
    /**
     * Whether to enable TLS for the connection.
     */
    tls?: boolean;
};

/**
 * Represents a Unix domain socket address.
 */
export type UnixConnectOptions = {
    transport?: "unix";
    path: string;
};

export type UdpAddress = Pick<NetAddress, "hostname" | "port">;

export type UdpConnectOptions = UdpAddress & {
    transport: "udp";
};

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
export class Socket {
    protected [_impl]: ToDict<Socket>;

    constructor(impl: ToDict<Socket>) {
        this[_impl] = impl;
    }

    /**
     * A promise that resolves when the socket is closed, or rejects if the socket
     * is closed with an error.
     */
    get closed(): Promise<void> {
        return this[_impl].closed;
    }

    /**
     * Closes both the readable and writable sides of the socket.
     */
    close(): Promise<void> {
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
}

/**
 * A socket stream represents a connection to a remote peer with a `readable`
 * stream and a `writable` stream.
 */
export class SocketStream extends Socket implements TransformStream<Uint8Array, Uint8Array> {
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

export class TcpSocketStream extends SocketStream {
    protected override[_impl]: ToDict<TcpSocketStream>;

    constructor(impl: ToDict<TcpSocketStream>) {
        super(impl);
        this[_impl] = impl;
    }

    get localAddress(): NetAddress | null {
        return this[_impl].localAddress ?? null;
    }

    get remoteAddress(): NetAddress | null {
        return this[_impl].remoteAddress ?? null;
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

export class UnixSocketStream extends SocketStream { }

export class UdpSocket extends Socket {
    protected override[_impl]: ToDict<UdpSocket>;

    constructor(impl: ToDict<UdpSocket>) {
        super(impl);
        this[_impl] = impl;
    }

    get localAddress(): NetAddress | null {
        return this[_impl].localAddress;
    }

    receive(): Promise<[Uint8Array, UdpAddress]> {
        return this[_impl].receive();
    }

    send(data: Uint8Array, to: UdpAddress): Promise<number> {
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
    connect(to: UdpAddress): Promise<UdpSocketStream> {
        return this[_impl].connect(to);
    }
}

export class UdpSocketStream extends Socket {
    protected override[_impl]: ToDict<UdpSocketStream>;

    constructor(impl: ToDict<UdpSocketStream>) {
        super(impl);
        this[_impl] = impl;
    }

    get localAddress(): NetAddress | null {
        return this[_impl].localAddress;
    }

    get remoteAddress(): NetAddress {
        return this[_impl].remoteAddress;
    }

    get readable(): ReadableStream<Uint8Array> {
        return this[_impl].readable;
    }

    get writable(): WritableStream<Uint8Array> {
        return this[_impl].writable;
    }
}
