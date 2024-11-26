import { connect as _connect } from "cloudflare:sockets";
import {
    ConnectOptions,
    TcpSocketStream,
    UdpBindOptions,
    UdpConnectOptions,
    UdpSocket,
    UdpSocketStream,
    UnixConnectOptions,
    UnixSocketStream,
} from "../net/types.ts";
import { constructNetAddress } from "../net/util.ts";

export type * from "../net/types.ts";

export async function randomPort(
    prefer: number | undefined = undefined,
    hostname: string | undefined = undefined
): Promise<number> {
    void prefer, hostname;
    throw new Error("Unsupported runtime");
}

export async function connect(options: ConnectOptions): Promise<TcpSocketStream>;
export async function connect(options: UnixConnectOptions): Promise<UnixSocketStream>;
export async function connect(options: UdpConnectOptions): Promise<UnixSocketStream>;
export async function connect(
    options: ConnectOptions | UnixConnectOptions | UdpConnectOptions
): Promise<TcpSocketStream | UnixSocketStream | UdpSocketStream> {
    if ("path" in options) {
        throw new Error("Unix domain socket is not supported in this runtime");
    } else if (options.transport === "udp") {
        throw new Error("UDP socket is not supported in this runtime");
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
        localAddress: localAddr ? constructNetAddress({
            hostname: localAddr.hostname,
            port: localAddr.port ? Number(localAddr.port) : 0,
        }) : null,
        remoteAddress: remoteAddr ? constructNetAddress({
            hostname: remoteAddr.hostname,
            port: remoteAddr.port ? Number(remoteAddr.port) : 0,
        }) : null,
        readable: impl.readable,
        writable: impl.writable,
        closed: impl.closed,
        close: impl.close.bind(impl),
        ref: () => void 0,
        unref: () => void 0,
        setKeepAlive: (keepAlive: boolean | undefined = undefined) => void keepAlive,
        setNoDelay: (noDelay: boolean | undefined = undefined) => void noDelay,
    });
}

export async function bindUdp(options: UdpBindOptions): Promise<UdpSocket> {
    void options;
    throw new Error("Unsupported runtime");
}
