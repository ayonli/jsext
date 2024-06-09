/**
 * Utility functions for handling HTTP related tasks, such as parsing headers.
 * @module
 * @experimental
 */

import { orderBy } from "./array.ts";
import bytes from "./bytes.ts";
import { isBun, isDeno, isNode } from "./env.ts";
import { FileInfo, createReadableStream, exists, readDir, readFile, stat } from "./fs.ts";
import { sha256 } from "./hash.ts";
import { Range, ServeStaticOptions, ifNoneMatch, parseRange } from "./http/util.ts";
import { isMain } from "./module.ts";
import { as } from "./object.ts";
import { join, startsWith } from "./path.ts";
import { readAsArray } from "./reader.ts";
import { dedent, stripStart } from "./string.ts";

export * from "./http/util.ts";

/**
 * Calculates the ETag for a given entity.
 * 
 * @example
 * ```ts
 * import { stat } from "@ayonli/jsext/fs";
 * import { etag } from "@ayonli/jsext/http";
 * 
 * const etag1 = await etag("Hello, World!");
 * 
 * const data = new Uint8Array([1, 2, 3, 4, 5]);
 * const etag2 = await etag(data);
 * 
 * const info = await stat("file.txt");
 * const etag3 = await etag(info);
 * ```
 */
export async function etag(data: string | Uint8Array | FileInfo): Promise<string> {
    if (typeof data === "string" || data instanceof Uint8Array) {
        if (!data.length) {
            // a short circuit for zero length entities
            return `0-47DEQpj8HBSa+/TImW+5JCeuQeR`;
        }

        if (typeof data === "string") {
            data = bytes(data);
        }

        const hash = await sha256(data, "base64");
        return `${data.length.toString(16)}-${hash.slice(0, 27)}`;
    }

    const mtime = data.mtime ?? new Date();
    const hash = await sha256(mtime.toISOString(), "base64");
    return `${data.size.toString(16)}-${hash.slice(0, 27)}`;
}

/**
 * Creates a Node.js HTTP request listener with modern Web APIs.
 * 
 * NOTE: This function requires Node.js v18.4.1 or above.
 * 
 * @example
 * ```ts
 * import * as http from "node:http";
 * import { withWeb } from "@ayonli/jsext/http";
 * 
 * const server = http.createServer(withWeb(async (req) => {
 *     return new Response("Hello, World!");
 * }));
 * 
 * server.listen(8000);
 * ```
 */
export function withWeb(
    listener: (req: Request) => void | Response | Promise<void | Response>
): import("http").RequestListener {
    return async (nReq, nRes) => {
        const req = toWebRequest(nReq);
        const res = await listener(req);

        if (res && !nRes.headersSent) {
            if (res.status === 101) {
                // When the status code is 101, it means the server is upgrading
                // the connection to a different protocol, usually to WebSocket.
                // In this case, the response shall be and may have already been
                // written by the request socket. So we should not write the
                // response again.
                return;
            }

            toNodeResponse(res, nRes);
        }
    };
}


/**
 * Transforms a Node.js HTTP request to a modern `Request` object.
 */
function toWebRequest(req: import("http").IncomingMessage): Request {
    const protocol = (req.socket as any)["encrypted"] ? "https" : "http";
    const url = new URL(req.url ?? "/", `${protocol}://${req.headers.host}`);
    const headers = new Headers(req.headers as Record<string, string>);
    const init: RequestInit = {
        method: req.method!,
        headers,
    };
    const cache = headers.get("Cache-Control");
    const mode = headers.get("Sec-Fetch-Mode");
    const referrer = headers.get("Referer");

    if (cache === "no-cache") {
        init.cache = "no-cache";
    } else if (cache === "no-store") {
        init.cache = "no-store";
    } else if (cache === "only-if-cached" && mode === "same-origin") {
        init.cache = "only-if-cached";
    } else {
        init.cache = "default";
    }

    if (mode === "no-cors") {
        init.mode = "no-cors";
    } else if (mode === "same-origin") {
        init.mode = "same-origin";
    } else {
        init.mode = "cors";
    }

    if (referrer) {
        init.referrer = referrer;
    }

    if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();

        req.on("data", (chunk) => {
            writer.write(chunk);
        }).once("error", (err) => {
            writer.abort(err);
        }).once("end", () => {
            writer.close();
        });

        init.body = readable;
        // @ts-ignore Node.js special
        init.duplex = "half";
    }

    const request = new Request(url, init);

    Object.assign(request, {
        [Symbol.for("incomingMessage")]: req,
    });

    return request;
}

/**
 * Pipes a modern `Response` object to a Node.js HTTP response.
 */
function toNodeResponse(res: Response, nodeRes: import("http").ServerResponse): void {
    const { status, statusText, headers } = res;

    for (const [key, value] of headers) {
        // Use `setHeader` to set headers instead of passing them to `writeHead`,
        // it seems in Deno, the headers are not written to the response if they
        // are passed to `writeHead`.
        nodeRes.setHeader(key, value);
    }

    nodeRes.writeHead(status, statusText);

    if (!res.body) {
        nodeRes.end();
    } else {
        res.body.pipeTo(new WritableStream({
            write(chunk) {
                nodeRes.write(chunk);
            },
            close() {
                nodeRes.end();
            },
            abort(err) {
                nodeRes.destroy(err);
            },
        }));
    }
}

/**
 * Serves static files from a file system directory.
 * 
 * @example
 * ```ts
 * import { serveStatic } from "@ayonli/jsext/http";
 * 
 * export default {
 *     async fetch(req: Request) {
 *         const { pathname } = new URL(req.url);
 * 
 *         if (pathname.startsWith("/assets")) {
 *             return await serveStatic(req, {
 *                 fsDir: "./public",
 *                 urlPrefix: "/assets",
 *             });
 *         }
 * 
 *         return new Response("Hello, World!");
 *     }
 * };
 * ```
 */
export async function serveStatic(
    req: Request,
    options: ServeStaticOptions = {}
): Promise<Response> {
    const dir = options.fsDir ?? ".";
    const prefix = options.urlPrefix ? join(options.urlPrefix) : "";
    const url = new URL(req.url);

    if (prefix && !startsWith(url.pathname, prefix)) {
        return new Response("Not Found", { status: 404, statusText: "Not Found" });
    }

    const filename = join(dir, stripStart(url.pathname.slice(prefix.length), "/"));
    let info: FileInfo;

    try {
        info = await stat(filename);
    } catch (err) {
        if (as(err, Error)?.name === "NotFoundError") {
            return new Response(`Not Found`, { status: 404, statusText: "Not Found" });
        } else if (as(err, Error)?.name === "NotAllowedError") {
            return new Response("Forbidden", { status: 403, statusText: "Forbidden" });
        } else {
            return new Response("Internal Server Error", {
                status: 500,
                statusText: "Internal Server Error",
            });
        }
    }

    if (info.kind === "directory") {
        if (!req.url.endsWith("/")) {
            return Response.redirect(req.url + "/", 301);
        } else {
            if (await exists(join(filename, "index.html"))) {
                return serveStatic(new Request(join(req.url, "index.html"), req), options);
            } else if (await exists(join(filename, "index.htm"))) {
                return serveStatic(new Request(join(req.url, "index.htm"), req), options);
            } else if (!options.listDir) {
                return new Response("Forbidden", { status: 403, statusText: "Forbidden" });
            } else {
                const entries = await readAsArray(readDir(filename));
                const list = [
                    ...orderBy(entries.filter(e => e.kind === "directory"), e => e.name, "asc"),
                    ...orderBy(entries.filter(e => e.kind === "file"), e => e.name, "asc"),
                ];
                const { pathname } = url;

                if (pathname !== "/") {
                    list.unshift({
                        kind: "directory",
                        name: "..",
                        relativePath: "..",
                    });
                }

                const listHtml = list.map((entry) => {
                    const name = entry.kind === "directory" ? entry.name + "/" : entry.name;
                    let url = join(pathname, entry.name);

                    if (entry.kind === "directory" && url !== "/") {
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
                        "Content-Type": "text/html; charset=utf-8",
                    },
                });
            }
        }
    } else if (info.kind !== "file") {
        return new Response("Forbidden", { status: 403, statusText: "Forbidden" });
    }

    const mtime = info.mtime ?? new Date();
    const _etag = await etag(info);
    const headers = new Headers({
        ...(options.headers ?? {}),
        "Accept-Ranges": "bytes",
        "Last-Modified": mtime.toUTCString(),
        "Etag": _etag,
    });

    const ifModifiedSinceValue = req.headers.get("If-Modified-Since");
    const ifNoneMatchValue = req.headers.get("If-None-Match");
    let modified = true;

    if (ifModifiedSinceValue) {
        const date = new Date(ifModifiedSinceValue);
        modified = Math.floor(mtime.valueOf() / 1000) > Math.floor(date.valueOf() / 1000);
    } else if (ifNoneMatchValue) {
        modified = ifNoneMatch(ifNoneMatchValue, _etag);
    }

    if (!modified) {
        return new Response(null, {
            status: 304,
            statusText: "Not Modified",
            headers,
        });
    }

    headers.set("Content-Disposition", `inline; filename="${info.name}"`);

    if (/^text\/|^application\/(json|yaml|toml|xml|javascript)$/.test(info.type)) {
        headers.set("Content-Type", info.type + "; charset=utf-8");
    } else {
        headers.set("Content-Type", info.type || "application/octet-stream");
    }

    if (info.atime) {
        headers.set("Date", info.atime.toUTCString());
    }

    if (options.maxAge) {
        headers.set("Cache-Control", `public, max-age=${options.maxAge}`);
    }

    const rangeValue = req.headers.get("Range");

    if (rangeValue && info.size) {
        let range: Range;

        try {
            range = parseRange(rangeValue);
        } catch {
            return new Response("Invalid Range header", {
                status: 416,
                statusText: "Range Not Satisfiable",
            });
        }

        const { ranges, suffix: suffixLength } = range;
        let start: number;
        let end: number;

        if (ranges.length) {
            ({ start } = ranges[0]!);
            end = Math.min(ranges[0]!.end ?? info.size - 1, info.size - 1);
        } else {
            start = Math.max(info.size - suffixLength!, 0);
            end = info.size - 1;
        }

        const data = await readFile(filename);
        const slice = data.subarray(start, end + 1);

        headers.set("Content-Range", `bytes ${start}-${end}/${info.size}`);
        headers.set("Content-Length", String(end - start + 1));

        return new Response(slice, {
            status: 206,
            statusText: "Partial Content",
            headers,
        });
    } else if (!info.size) {
        headers.set("Content-Length", "0");

        return new Response("", {
            status: 200,
            statusText: "OK",
            headers,
        });
    } else {
        headers.set("Content-Length", String(info.size));

        return new Response(createReadableStream(filename), {
            status: 200,
            statusText: "OK",
            headers,
        });
    }
}

declare const Bun: any;

if (isMain(import.meta)) {
    if (isDeno) {
        Deno.serve({ port: 8000 }, req => serveStatic(req, { listDir: true }));
    } else if (isBun) {
        Bun.serve({
            port: 8000,
            fetch: (req: Request) => serveStatic(req, { listDir: true }),
        });
        console.log("Listening on http://localhost:8000/");
    } else if (isNode) {
        import("node:http").then(async ({ createServer }) => {
            const server = createServer(withWeb(async (req) => {
                return serveStatic(req, { listDir: true });
            }));
            server.listen(8000);
            console.log("Listening on http://localhost:8000/");
        });
    }
}
