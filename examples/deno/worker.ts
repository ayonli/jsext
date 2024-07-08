import type { Channel } from "../../chan.ts";
import { readChannel, wireChannel } from "./util.ts";
import handle from "./handler.ts";

export interface RequestMessage extends Omit<RequestInit, "body" | "signal"> {
    url: string;
    headers: Record<string, string>;
    streamBody?: boolean;
    body?: ArrayBuffer | null;
}

export interface ResponseMessage extends ResponseInit {
    url: string;
    headers: Record<string, string>;
    streamBody?: boolean;
    body?: ArrayBuffer | null;
}

export async function parallelHandle(
    reqMsg: RequestMessage,
    channel: Channel<{ value: Uint8Array | undefined, done: boolean; }> | null = null
): Promise<ResponseMessage> {
    const { url, streamBody, body, ...init } = reqMsg;

    // Rebuild the request object in the worker.
    const req = new Request(url, {
        ...init,
        body: streamBody && channel ? readChannel(channel) : (body ?? null),
    });

    const res = await handle(req);

    res.body && channel ? wireChannel(res.body, channel) : null;

    return {
        url: res.url,
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        streamBody: !!res.body && !!channel,
        body: res.body && !channel ? await res.arrayBuffer() : null,
    };
}
