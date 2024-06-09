import { type ServeStaticOptions } from "../http/util.ts";

export * from "../http/util.ts";

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
