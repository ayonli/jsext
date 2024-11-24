import { connect as _connect } from "cloudflare:sockets";
import { ConnectOptions, Socket } from "../net/types.ts";
import { constructNetAddress } from "../net/util.ts";

export * from "../net/types.ts";

export async function connect(options: ConnectOptions): Promise<Socket> {
    const createSocket = async (
        impl: any,
        startTls: () => Promise<Socket>
    ) => {
        const info = await impl.opened;
        const localAddr = info.localAddress
            ? new URL("http://" + info.localAddress)
            : null;
        const remoteAddr = info.remoteAddress
            ? new URL("http://" + info.remoteAddress)
            : null;

        return new Socket({
            localAddress: localAddr ? constructNetAddress({
                family: localAddr.hostname.includes(":") ? "IPv6" : "IPv4",
                hostname: localAddr.hostname,
                port: localAddr.port ? Number(localAddr.port) : 0,
            }) : null,
            remoteAddress: remoteAddr ? constructNetAddress({
                family: remoteAddr.hostname.includes(":") ? "IPv6" : "IPv4",
                hostname: remoteAddr.hostname,
                port: remoteAddr.port ? Number(remoteAddr.port) : 0,
            }) : null,
            readable: impl.readable,
            writable: impl.writable,
            closed: impl.closed,
            close: impl.close.bind(impl),
            startTls,
            ref: () => void 0,
            unref: () => void 0,
        });
    };

    const _socket = _connect({
        ...options,
        hostname: options.hostname ?? "localhost",
    }, {
        secureTransport: "starttls",
        allowHalfOpen: false,
    });
    return await createSocket(_socket, async () => {
        const __socket = _socket.startTls();
        return await createSocket(__socket, async () => {
            throw new Error("TLS already started");
        });
    });
}
