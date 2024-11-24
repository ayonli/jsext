/**
 * Represents the network address of a connection peer.
 */
export interface NetAddress {
    family: "IPv4" | "IPv6";
    /**
     * The hostname of the remote peer.
     */
    hostname: string;
    /**
     * @deprecated use `hostname` instead.
     */
    readonly address: string;
    /**
     * The port number of the remote peer, or `0` if it's not available.
     */
    port: number;
}

export interface ConnectOptions {
    hostname?: string;
    port: number;
}

const _impl = Symbol.for("impl");

export class Socket {
    private [_impl]?: {
        [K in keyof Socket]: Socket[K];
    };

    constructor(impl: {
        [K in keyof Socket]: Socket[K];
    }) {
        this[_impl] = impl;
    }

    get localAddress(): NetAddress | null {
        return this[_impl]!.localAddress ?? null;
    }

    get remoteAddress(): NetAddress | null {
        return this[_impl]!.remoteAddress ?? null;
    }

    get readable(): ReadableStream {
        return this[_impl]!.readable;
    }

    get writable(): WritableStream {
        return this[_impl]!.writable;
    }

    get closed(): Promise<void> {
        return this[_impl]!.closed;
    }

    close(): Promise<void> {
        return this[_impl]!.close();
    }

    startTls(): Promise<Socket> {
        return this[_impl]!.startTls();
    }

    ref(): void {
        return this[_impl]!.ref();
    }

    unref(): void {
        return this[_impl]!.unref();
    }
}
