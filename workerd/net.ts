import { connect as _connect } from "cloudflare:sockets";
import { throwUnsupportedRuntimeError } from "../error.ts";
import {
    TcpConnectOptions,
    TcpSocketStream,
    UdpBindOptions,
    UdpConnectOptions,
    UdpSocket,
    UdpSocketStream,
    UnixConnectOptions,
    UnixSocketStream,
} from "../net/types.ts";

export type * from "../net/types.ts";

export async function getMyIp(): Promise<string> {
    throwUnsupportedRuntimeError();
}

export async function randomPort(
    prefer: number | undefined = undefined,
    hostname: string | undefined = undefined
): Promise<number> {
    void prefer, hostname;
    throwUnsupportedRuntimeError();
}

export async function connect(options: TcpConnectOptions): Promise<TcpSocketStream>;
export async function connect(options: UnixConnectOptions): Promise<UnixSocketStream>;
export async function connect(options: UdpConnectOptions): Promise<UdpSocketStream>;
export async function connect(
    options: TcpConnectOptions | UnixConnectOptions | UdpConnectOptions
): Promise<TcpSocketStream | UnixSocketStream | UdpSocketStream> {
    if ("path" in options) {
        throw new NotSupportedError("Unix domain socket is not supported in this runtime.");
    } else if (options.transport === "udp") {
        throw new NotSupportedError("UDP socket is not supported in this runtime.");
    }

    const { tls = false, ..._options } = options;
    const impl = _connect(_options, {
        secureTransport: tls ? "on" : "off",
        allowHalfOpen: false,
    });
    const info = await impl.opened;
    const localAddr = info.localAddress
        ? new URL("http://" + info.localAddress)
        : null;
    const remoteAddr = info.remoteAddress
        ? new URL("http://" + info.remoteAddress)
        : null;

    return new TcpSocketStream({
        localAddress: localAddr ? {
            hostname: localAddr.hostname,
            port: localAddr.port ? Number(localAddr.port) : 0,
        } : {
            hostname: options.hostname,
            port: options.port,
        },
        remoteAddress: remoteAddr ? {
            hostname: remoteAddr.hostname,
            port: remoteAddr.port ? Number(remoteAddr.port) : 0,
        } : {
            hostname: options.hostname,
            port: options.port,
        },
        readable: impl.readable,
        writable: impl.writable,
        closed: impl.closed,
        close: () => void impl.close().catch(() => void 0),
        ref: () => void 0,
        unref: () => void 0,
        setKeepAlive: (keepAlive: boolean | undefined = undefined) => void keepAlive,
        setNoDelay: (noDelay: boolean | undefined = undefined) => void noDelay,
    });
}

export async function udpSocket(options: UdpBindOptions): Promise<UdpSocket> {
    void options;
    throwUnsupportedRuntimeError();
}
