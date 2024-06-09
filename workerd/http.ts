import bytes from "../bytes.ts";
import { type FileInfo } from "./fs.ts";
import { sha256 } from "./hash.ts";
import { type ServeStaticOptions } from "../http/util.ts";

export * from "../http/util.ts";

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

export function withWeb(
    listener: (req: Request) => void | Response | Promise<void | Response>
): import("http").RequestListener {
    void listener;
    throw new Error("Unsupported runtime");
}

export async function serveStatic(
    req: Request,
    options: ServeStaticOptions = {}
): Promise<Response> {
    void req, options;
    throw new Error("Unsupported runtime");
}
