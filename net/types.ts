import type { connect } from "../net.ts";

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
 * Represents a Unix domain socket address.
 */
export interface UnixAddress {
    path: string;
}

/**
 * The options for {@link connect}.
 */
export type ConnectOptions = Pick<NetAddress, "hostname" | "port"> & {
    /**
     * Whether to enable TLS for the connection.
     */
    tls?: boolean;
};

const _impl = Symbol.for("impl");

/**
 * A socket represents a network connection, currently only supports TCP.
 */
export class Socket<A extends NetAddress | UnixAddress> {
    protected [_impl]: {
        [K in keyof Socket<A>]: Socket<A>[K];
    };

    constructor(impl: {
        [K in keyof Socket<A>]: Socket<A>[K];
    }) {
        this[_impl] = impl;
    }

    get localAddress(): A | null {
        return this[_impl].localAddress ?? null;
    }

    get remoteAddress(): A | null {
        return this[_impl].remoteAddress ?? null;
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
     */
    ref(): void {
        return this[_impl].ref();
    }

    /**
     * Calling `unref()` on a socket will allow the program to exit if this is
     * the only active socket in the event system. If the socket is already
     * unrefed calling `unref()` again will have no effect.
     */
    unref(): void {
        return this[_impl].unref();
    }
}

export class TcpSocket extends Socket<NetAddress> {
    protected [_impl]: {
        [K in keyof TcpSocket]: TcpSocket[K];
    };

    constructor(impl: {
        [K in keyof TcpSocket]: TcpSocket[K];
    }) {
        super(impl);
        this[_impl] = impl;
    }

    setKeepAlive(keepAlive: boolean | undefined = undefined): void {
        return this[_impl].setKeepAlive(keepAlive);
    }

    setNoDelay(noDelay: boolean | undefined = undefined): void {
        return this[_impl].setNoDelay(noDelay);
    }
}

export class UnixSocket extends Socket<UnixAddress> {
    protected [_impl]: {
        [K in keyof UnixSocket]: UnixSocket[K];
    };

    constructor(impl: {
        [K in keyof UnixSocket]: UnixSocket[K];
    }) {
        super(impl);
        this[_impl] = impl;
    }
}
