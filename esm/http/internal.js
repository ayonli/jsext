import { orderBy } from '../array.js';
import { join } from '../path.js';
import runtime from '../runtime.js';
import { EventEndpoint } from '../sse.js';
import { dedent } from '../string.js';

function createContext(request, props) {
    const { ws, remoteAddress = null, ...rest } = props;
    return {
        remoteAddress,
        createEventEndpoint: () => {
            const events = new EventEndpoint(request);
            return { events, response: events.response };
        },
        upgradeWebSocket: () => ws.upgrade(request),
        ...rest,
    };
}
function withHeaders(handle, headers = undefined) {
    if (headers === undefined) {
        const { identity, version } = runtime();
        let serverName = ({
            "node": "Node.js",
            "deno": "Deno",
            "bun": "Bun",
            "workerd": "Cloudflare Workers",
            "fastly": "Fastly Compute",
        })[identity] || "Unknown";
        if (version) {
            serverName += `/${version}`;
        }
        headers = { "Server": serverName };
    }
    return (...args) => Promise.resolve(handle(...args))
        .then((response) => {
        if (response.status === 101) {
            // WebSocket headers cannot be modified
            return response;
        }
        try {
            const patch = (name, value) => {
                if (!response.headers.has(name)) {
                    response.headers.set(name, value);
                }
            };
            if (headers instanceof Headers) {
                headers.forEach((value, name) => patch(name, value));
            }
            else if (Array.isArray(headers)) {
                headers.forEach(([name, value]) => patch(name, value));
            }
            else if (headers !== null) {
                Object.entries(headers).forEach(([name, value]) => patch(name, value));
            }
        }
        catch (_a) {
            // In case the headers are immutable, ignore the error.
        }
        return response;
    });
}
function listenFetchEvent(options) {
    const { ws, fetch, headers, onError, bindings } = options;
    // @ts-ignore
    addEventListener("fetch", (event) => {
        var _a, _b, _c;
        const { request } = event;
        const address = (_a = request.headers.get("cf-connecting-ip")) !== null && _a !== void 0 ? _a : (_b = event.client) === null || _b === void 0 ? void 0 : _b.address;
        const ctx = createContext(request, {
            ws,
            remoteAddress: address ? {
                family: address.includes(":") ? "IPv6" : "IPv4",
                address: address,
                port: 0,
            } : null,
            waitUntil: (_c = event.waitUntil) === null || _c === void 0 ? void 0 : _c.bind(event),
            bindings,
        });
        const _handle = withHeaders(fetch, headers);
        const _onError = withHeaders(onError, headers);
        const response = Promise.resolve((_handle(request, ctx)))
            .catch(err => _onError(err, request, ctx));
        event.respondWith(response);
    });
}
async function respondDir(entries, pathname, extraHeaders = {}) {
    const list = [
        ...orderBy(entries.filter(e => e.kind === "directory"), e => e.name).map(e => e.name + "/"),
        ...orderBy(entries.filter(e => e.kind === "file"), e => e.name).map(e => e.name),
    ];
    if (pathname !== "/") {
        list.unshift("../");
    }
    const listHtml = list.map((name) => {
        let url = join(pathname, name);
        if (name.endsWith("/") && url !== "/") {
            url += "/";
        }
        return dedent `
            <li>
                <a href="${url}">${name}</a>
            </li>
            `;
    });
    return new Response(dedent `
                <!DOCTYPE HTML>
                <html lang="en">
                <head>
                    <meta charset="utf-8">
                    <title>Directory listing for ${pathname}</title>
                    <style>
                    body {
                        font-family: system-ui;
                    }
                    </style>
                </head>
                <body>
                    <h1>Directory listing for ${pathname}</h1>
                    <hr>
                    <ul>
                        ${listHtml.join("")}
                    </ul>
                </body>
                </html>
                `, {
        status: 200,
        statusText: "OK",
        headers: {
            ...extraHeaders,
            "Content-Type": "text/html; charset=utf-8",
        },
    });
}

export { createContext, listenFetchEvent, respondDir, withHeaders };
//# sourceMappingURL=internal.js.map
