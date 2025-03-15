import { NotImplementedError } from "../error.ts";
import { getMIME } from "../filetype.ts";
import { exists, readDir, readFile } from "./fs.ts";
import { renderDirectoryPage, withWeb } from "../http/internal.ts";
import {
    NetAddress,
    RequestContext,
    RequestHandler,
    RequestErrorHandler,
    ServeOptions,
    ServeStaticOptions,
    HttpServer,
} from "../http/server.ts";
import { etag, ifMatch, ifNoneMatch, parseRange, Range } from "../http/util.ts";
import { as } from "../object.ts";
import { extname, join, startsWith } from "../path.ts";
import { readAsArray } from "../reader.ts";
import { stripStart } from "../string.ts";
import { KVNamespace } from "./types.ts";
import { WebSocketServer } from "./ws.ts";
import runtime from "../runtime.ts";

export { withWeb };
export * from "../http/util.ts";
export type {
    /**
     * @deprecated Use `NetAddress` from `@ayonli/jsext/net` instead.
     */
    NetAddress,
    RequestContext,
    RequestHandler,
    RequestErrorHandler,
    ServeOptions,
    ServeStaticOptions,
    HttpServer,
};

/**
 * @deprecated Use {@link HttpServer} instead.
 */
export type Server = HttpServer;

export async function randomPort(prefer: number | undefined = undefined): Promise<number> {
    void prefer;
    throw new NotImplementedError("Unsupported runtime");
}

export function serve(options: ServeOptions): HttpServer {
    const { identity } = runtime();
    const type = identity === "workerd" ? options.type || "classic" : "classic";
    const ws = new WebSocketServer(options.ws);
    const { fetch, onError, onListen, headers } = options;

    // @ts-ignore
    return new HttpServer(async () => {
        return { http: null, hostname: "", port: 0 };
    }, { type, fetch, onError, onListen, ws, headers });
}

export async function serveStatic(
    req: Request,
    options: ServeStaticOptions = {}
): Promise<Response> {
    // @ts-ignore
    const kv = options.kv ?? (globalThis["__STATIC_CONTENT"] as KVNamespace | undefined);

    if (!kv) {
        return new Response("Service Unavailable", {
            status: 503,
            statusText: "Service Unavailable",
        });
    }

    const extraHeaders = options.headers ?? {};
    const prefix = options.urlPrefix ? join(options.urlPrefix) : "";
    const url = new URL(req.url);
    const pathname = decodeURIComponent(url.pathname);

    if (prefix && !startsWith(pathname, prefix)) {
        return new Response("Not Found", {
            status: 404,
            statusText: "Not Found",
            headers: extraHeaders,
        });
    }

    let filename = stripStart(pathname.slice(prefix.length), "/");
    if (filename === "/" || filename === ".") {
        filename = "";
    }

    if (pathname.endsWith("/")) {
        const indexHtml = filename ? join(filename, "index.html") : "index.html";
        const indexHtm = filename ? join(filename, "index.htm") : "index.htm";

        if (await exists(indexHtml, { root: kv })) {
            const data = await readFile(indexHtml, { root: kv });
            return await serveFile(data, {
                filename: indexHtml,
                reqHeaders: req.headers,
                extraHeaders,
                maxAge: options.maxAge ?? 0,
            });
        } else if (await exists(indexHtm, { root: kv })) {
            const data = await readFile(indexHtm, { root: kv });
            return await serveFile(data, {
                filename: indexHtm,
                reqHeaders: req.headers,
                extraHeaders,
                maxAge: options.maxAge ?? 0,
            });
        } else if (options.listDir) {
            const entries = await readAsArray(readDir(filename, { root: kv }));
            return renderDirectoryPage(pathname, entries, extraHeaders);
        } else {
            return new Response("Forbidden", {
                status: 403,
                statusText: "Forbidden",
                headers: extraHeaders,
            });
        }
    } else if (filename) {
        try {
            const data = await readFile(filename, { root: kv });
            return await serveFile(data, {
                filename,
                reqHeaders: req.headers,
                extraHeaders,
                maxAge: options.maxAge ?? 0,
            });
        } catch (err) {
            if (as(err, Error)?.name === "NotFoundError") {
                return new Response("Not Found", {
                    status: 404,
                    statusText: "Not Found",
                    headers: extraHeaders,
                });
            } else {
                return new Response("Internal Server Error", {
                    status: 500,
                    statusText: "Internal Server Error",
                    headers: extraHeaders,
                });
            }
        }
    } else {
        return Response.redirect(req.url + "/", 301);
    }
}

async function serveFile(data: Uint8Array, options: {
    filename: string;
    reqHeaders: Headers;
    extraHeaders: HeadersInit;
    maxAge: number;
}) {
    const { filename, reqHeaders, extraHeaders } = options;
    const ext = extname(filename);
    const type = getMIME(ext) ?? "";
    const rangeValue = reqHeaders.get("Range");
    let range: Range | undefined;

    if (rangeValue && data.byteLength) {
        try {
            range = parseRange(rangeValue);
        } catch {
            return new Response("Invalid Range header", {
                status: 416,
                statusText: "Range Not Satisfiable",
                headers: extraHeaders,
            });
        }
    }

    const _etag = await etag(data);
    const headers = new Headers({
        ...extraHeaders,
        "Accept-Ranges": "bytes",
        "Etag": _etag,
    });

    const ifNoneMatchValue = reqHeaders.get("If-None-Match");
    const ifMatchValue = reqHeaders.get("If-Match");
    let modified = true;

    if (ifNoneMatchValue) {
        modified = ifNoneMatch(ifNoneMatchValue, _etag);
    }

    if (!modified) {
        return new Response(null, {
            status: 304,
            statusText: "Not Modified",
            headers,
        });
    } else if (ifMatchValue && range && !ifMatch(ifMatchValue, _etag)) {
        return new Response("Precondition Failed", {
            status: 412,
            statusText: "Precondition Failed",
            headers,
        });
    }

    if (type) {
        if (/^text\/|^application\/(json|yaml|toml|xml|javascript)$/.test(type)) {
            headers.set("Content-Type", type + "; charset=utf-8");
        } else {
            headers.set("Content-Type", type);
        }
    } else {
        headers.set("Content-Type", "application/octet-stream");
    }

    if (options.maxAge) {
        headers.set("Cache-Control", `public, max-age=${options.maxAge}`);
    }

    if (range) {
        const { ranges, suffix: suffixLength } = range;
        let start: number;
        let end: number;

        if (ranges.length) {
            ({ start } = ranges[0]!);
            end = Math.min(ranges[0]!.end ?? data.byteLength - 1, data.byteLength - 1);
        } else {
            start = Math.max(data.byteLength - suffixLength!, 0);
            end = data.byteLength - 1;
        }

        const slice = data.subarray(start, end + 1);

        headers.set("Content-Range", `bytes ${start}-${end}/${data.byteLength}`);
        headers.set("Content-Length", String(end - start + 1));

        return new Response(slice, {
            status: 206,
            statusText: "Partial Content",
            headers,
        });
    } else if (!data.byteLength) {
        headers.set("Content-Length", "0");

        return new Response("", {
            status: 200,
            statusText: "OK",
            headers,
        });
    } else {
        headers.set("Content-Length", String(data.byteLength));

        return new Response(data, {
            status: 200,
            statusText: "OK",
            headers,
        });
    }
}
