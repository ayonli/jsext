import { connect as _connect } from "cloudflare:sockets";
import { ConnectOptions, Socket } from "../net/types.ts";
import { constructNetAddress } from "../net/util.ts";

export type * from "../net/types.ts";

export async function connect(options: ConnectOptions): Promise<Socket> {
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

    return new Socket({
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
    });
}
