import { connect as connect$1 } from 'cloudflare:sockets';
import { Socket } from '../net/types.js';
import { constructNetAddress } from '../net/util.js';

async function connect(options) {
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

export { connect };
//# sourceMappingURL=net.js.map
