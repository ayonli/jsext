import { connect as connect$1 } from 'cloudflare:sockets';
import { Socket } from '../net/types.js';
import { constructNetAddress } from '../net/util.js';

async function connect(options) {
    var _a;
    const createSocket = async (impl, startTls) => {
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
    const _socket = connect$1({
        ...options,
        hostname: (_a = options.hostname) !== null && _a !== void 0 ? _a : "localhost",
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

export { Socket, connect };
//# sourceMappingURL=net.js.map
