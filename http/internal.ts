/**
 * This is an internal module that provides utility functions for handling HTTP
 * requests, mostly used by the `http.serve` and `http.serveStatic` functions.
 * 
 * This module is exposed for advanced use cases such as when we want to
 * implement a new `serve` function that behave like the existing one, e.g. for
 * integrating with Vite dev server.
 * 
 * @module
 * @experimental
 */
import { orderBy } from "../array.ts";
import { DirEntry } from "../fs.ts";
import { join } from "../path.ts";
import runtime from "../runtime.ts";
import { EventEndpoint } from "../sse.ts";
import { dedent } from "../string.ts";
import type { FetchEvent, RequestContext, RequestErrorHandler, ServeOptions } from "./server.ts";
import type { WebSocketServer } from "../ws.ts";

export interface TimingMetrics {
    timeStart: number;
    timeEnd?: number | undefined;
    description?: string | undefined;
}

export type TimingFunctions = Pick<RequestContext, "time" | "timeEnd">;

/**
 * Creates timing functions for measuring the request processing time. This
 * function returns the timing functions and a `timers` map that associates
 * to them.
 */
export function createTimingFunctions(): TimingFunctions & {
    timers: Map<string, TimingMetrics>;
} {
    const timers = new Map<string, TimingMetrics>();

    return {
        timers,
        time: (name: string, description?: string) => {
            timers.set(name, { timeStart: Date.now(), description });
        },
        timeEnd: (name: string) => {
            const metrics = timers.get(name);

            if (metrics) {
                metrics.timeEnd = Date.now();
            } else {
                console.warn(`Timer '${name}' does not exist`);
            }
        },
    };
}

/**
 * Creates a request context object from the given `request` and properties.
 */
export function createRequestContext(
    request: Request,
    props: Pick<RequestContext, "remoteAddress" | "waitUntil" | "bindings"> & TimingFunctions & {
        ws: WebSocketServer;
    }
): RequestContext {
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
};

/**
 * Patches the timing metrics to the response's headers.
 */
export function patchTimingMetrics(
    response: Response,
    timers: Map<string, TimingMetrics>
): Response {
    const total = timers.get("total");
    let metrics = [...timers].filter(([label, metrics]) => {
        return typeof metrics.timeEnd === "number" && label !== "total";
    }).map(([name, metrics]) => {
        const duration = metrics.timeEnd! - metrics.timeStart;
        let value = `${name};dur=${duration}`;

        if (metrics.description) {
            value += `;desc="${metrics.description}"`;
        }

        return value;
    }).join(", ");

    if (total && typeof total.timeEnd === "number") { // patch total timer at the end
        const duration = total.timeEnd - total.timeStart;
        const desc = total.description || "Total";
        const totalValue = `total;dur=${duration};desc="${desc}"`;

        if (metrics) {
            metrics += `, ${totalValue}`;
        } else {
            metrics = totalValue;
        }
    }

    if (metrics) {
        try {
            response.headers.set("Server-Timing", metrics);
        } catch {
            // Ignore
        }
    }

    return response;
}

/**
 * Returns a new request handler that wraps the given one so that we can add
 * extra `headers` to the response.
 */
export function withHeaders<A extends any[]>(
    handle: (...args: A) => Response | Promise<Response>,
    headers: HeadersInit | null | undefined = undefined,
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

    return async (...args: A) => {
        const response = await handle(...args);

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
    };
}

/**
 * Adds a event listener to the `fetch` event in service workers that handles
 * HTTP requests with the given options.
 */
export function listenFetchEvent(options: Pick<ServeOptions, "fetch" | "headers"> & {
    onError: RequestErrorHandler;
    ws: WebSocketServer;
    bindings?: RequestContext["bindings"];
}): void {
    const { ws, fetch, headers, onError, bindings } = options;

    // @ts-ignore
    addEventListener("fetch", (event: FetchEvent) => {
        const { request } = event;
        const address = request.headers.get("cf-connecting-ip")
            ?? event.client?.address;
        const { timers, time, timeEnd } = createTimingFunctions();
        const ctx = createRequestContext(request, {
            ws,
            remoteAddress: address ? {
                family: address.includes(":") ? "IPv6" : "IPv4",
                address: address,
                port: 0,
            } : null,
            time,
            timeEnd,
            waitUntil: event.waitUntil?.bind(event),
            bindings,
        });

        const _handle = withHeaders(fetch, headers);
        const _onError = withHeaders(onError, headers);
        const response = _handle(request, ctx)
            .then(res => patchTimingMetrics(res, timers))
            .catch(err => _onError(err, request, ctx));

        event.respondWith(response);
    });
}

/**
 * Renders a directory listing page for the `pathname` with the given `entries`.
 */
export async function renderDirPage(
    pathname: string,
    entries: DirEntry[],
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
