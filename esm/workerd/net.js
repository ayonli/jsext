import { connect as connect$1 } from 'cloudflare:sockets';
import { TcpSocket } from '../net/types.js';
import { constructNetAddress } from '../net/util.js';

async function randomPort(prefer = undefined, hostname = undefined) {
    throw new Error("Unsupported runtime");
}
async function connect(options) {
    if ("path" in options) {
        throw new Error("Unsupported runtime");
    }
    const { tls = false, ..._options } = options;
    const impl = connect$1(_options, {
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
    return new TcpSocket({
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
        setKeepAlive: (keepAlive = undefined) => void keepAlive,
        setNoDelay: (noDelay = undefined) => void noDelay,
    });
}

export { connect, randomPort };
//# sourceMappingURL=net.js.map
