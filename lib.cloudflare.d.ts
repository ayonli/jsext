declare module "cloudflare:sockets" {
    interface SocketAddress {
        hostname: string;
        port: number;
    }

    interface SocketInfo {
        remoteAddress?: string;
        localAddress?: string;
    }

    interface SocketOptions {
        secureTransport?: string;
        allowHalfOpen: boolean;
        highWaterMark?: number | bigint;
    }

    interface Socket {
        get readable(): ReadableStream;
        get writable(): WritableStream;
        get closed(): Promise<void>;
        get opened(): Promise<SocketInfo>;
        close(): Promise<void>;
        startTls(options?: TlsOptions): Socket;
    }

    interface TlsOptions {
        expectedServerHostname?: string;
    }

    function connect(
        address: string | SocketAddress,
        options?: SocketOptions,
    ): Socket;
}
