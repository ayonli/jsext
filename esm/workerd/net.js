import { connect as connect$1 } from 'cloudflare:sockets';
import { TcpSocketStream } from '../net/types.js';

async function getMyIp() {
    throw new Error("Unsupported runtime");
}
async function randomPort(prefer = undefined, hostname = undefined) {
    throw new Error("Unsupported runtime");
}
async function connect(options) {
    if ("path" in options) {
        throw new Error("Unix domain socket is not supported in this runtime.");
    }
    else if (options.transport === "udp") {
        throw new Error("UDP socket is not supported in this runtime.");
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
        setKeepAlive: (keepAlive = undefined) => void keepAlive,
        setNoDelay: (noDelay = undefined) => void noDelay,
    });
}
async function udpSocket(options) {
    throw new Error("Unsupported runtime");
}

export { connect, getMyIp, randomPort, udpSocket };
//# sourceMappingURL=net.js.map
