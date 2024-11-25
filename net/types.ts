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
export type ConnectOptions = Pick<NetAddress, "hostname" | "port"> & {
    /**
     * Whether to enable TLS for the connection.
     */
    tls?: boolean;
};

/**
 * Represents a Unix domain socket address.
 */
export interface UnixConnectOptions {
    path: string;
}

const _impl = Symbol.for("impl");

/**
 * A socket represents a network connection, currently only supports TCP.
 */
export class Socket {
    protected [_impl]: ToDict<Socket>;

    constructor(impl: ToDict<Socket>) {
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

export class TcpSocket extends Socket {
    protected [_impl]: ToDict<TcpSocket>;

    constructor(impl: ToDict<TcpSocket>) {
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

export class UnixSocket extends Socket { }
