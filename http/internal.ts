import { orderBy } from "../array.ts";
import { DirEntry } from "../fs.ts";
import { join } from "../path.ts";
import runtime from "../runtime.ts";
import { EventEndpoint } from "../sse.ts";
import { dedent } from "../string.ts";
import type { FetchEvent, RequestContext, RequestErrorHandler, ServeOptions } from "./server.ts";
import type { WebSocketServer } from "../ws.ts";

export function createContext(
    request: Request,
    props: Pick<RequestContext, "remoteAddress" | "waitUntil" | "bindings"> & {
        ws: WebSocketServer;
    }
) {
    const { ws, remoteAddress = null, ...rest } = props;
    return {
        remoteAddress,
        createEventEndpoint: () => {
            const events = new EventEndpoint(request);
            return { events, response: events.response };
        },
        upgradeWebSocket: () => ws.upgrade(request),
        ...rest,
    } as RequestContext;
};

export function withHeaders<A extends any[]>(
    handle: (...args: A) => Response | Promise<Response>,
    headers: HeadersInit | null | undefined = undefined
): (...args: A) => Promise<Response> {
    if (headers === undefined) {
        const { identity, version } = runtime();
        let serverName = ({
            "node": "Node.js",
            "deno": "Deno",
            "bun": "Bun",
            "workerd": "Cloudflare Workers",
            "fastly": "Fastly Compute",
        })[identity as string] || "Unknown";

        if (version) {
            serverName += `/${version}`;
        }

        headers = { "Server": serverName };
    }

    return (...args: A) => Promise.resolve(handle(...args))
        .then((response) => {
            if (response.status === 101) {
                // WebSocket headers cannot be modified
                return response;
            }

            try {
                const patch = (name: string, value: string) => {
                    if (!response.headers.has(name)) {
                        response.headers.set(name, value);
                    }
                };

                if (headers instanceof Headers) {
                    headers.forEach((value, name) => patch(name, value));
                } else if (Array.isArray(headers)) {
                    headers.forEach(([name, value]) => patch(name, value));
                } else if (headers !== null) {
                    Object.entries(headers).forEach(([name, value]) => patch(name, value));
                }
            } catch {
                // In case the headers are immutable, ignore the error.
            }

            return response;
        });
}

export function listenFetchEvent(options: Pick<ServeOptions, "fetch" | "headers"> & {
    onError: RequestErrorHandler;
    ws: WebSocketServer;
    bindings?: RequestContext["bindings"];
}) {
    const { ws, fetch, headers, onError, bindings } = options;

    // @ts-ignore
    addEventListener("fetch", (event: FetchEvent) => {
        const { request } = event;
        const address = request.headers.get("cf-connecting-ip")
            ?? event.client?.address;
        const ctx = createContext(request, {
            ws,
            remoteAddress: address ? {
                family: address.includes(":") ? "IPv6" : "IPv4",
                address: address,
                port: 0,
            } : null,
            waitUntil: event.waitUntil?.bind(event),
            bindings,
        });

        const _handle = withHeaders(fetch, headers);
        const _onError = withHeaders(onError, headers);
        const response = Promise.resolve((_handle(request, ctx)))
            .catch(err => _onError(err, request, ctx));

        event.respondWith(response);
    });
}

export async function respondDir(
    entries: DirEntry[],
    pathname: string,
    extraHeaders: HeadersInit = {}
): Promise<Response> {
    const list = [
        ...orderBy(
            entries.filter(e => e.kind === "directory"),
            e => e.name
        ).map(e => e.name + "/"),
        ...orderBy(
            entries.filter(e => e.kind === "file"),
            e => e.name
        ).map(e => e.name),
    ];

    if (pathname !== "/") {
        list.unshift("../");
    }

    const listHtml = list.map((name) => {
        let url = join(pathname, name);

        if (name.endsWith("/") && url !== "/") {
            url += "/";
        }

        return dedent`
            <li>
                <a href="${url}">${name}</a>
            </li>
            `;
    });

    return new Response(dedent`
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
