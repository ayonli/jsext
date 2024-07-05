import bytes from "../bytes.ts";
import { type FileInfo } from "./fs.ts";
import { sha256 } from "./hash.ts";
import { NetAddress, RequestHandler, ServeOptions, ServeStaticOptions, Server } from "../http/server.ts";
import { WebSocketServer } from "./ws.ts";

export * from "../http/util.ts";
export type { NetAddress, RequestHandler, ServeOptions, Server };

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

export async function randomPort(prefer: number | undefined = undefined): Promise<number> {
    void prefer;
    throw new Error("Unsupported runtime");
}

export function withWeb(
    listener: (req: Request) => void | Response | Promise<void | Response>
): import("http").RequestListener {
    void listener;
    throw new Error("Unsupported runtime");
}

export function serve(options: ServeOptions): Server {
    // @ts-ignore
    return new Server(async () => {
        const ws = new WebSocketServer(options.ws);
        return {
            http: null,
            ws,
            hostname: "",
            port: 0,
            fetch: options.fetch,
        };
    });
}

export async function serveStatic(
    req: Request,
    options: ServeStaticOptions = {}
): Promise<Response> {
    void req, options;
    throw new Error("Unsupported runtime");
}
