import type { Channel } from "../../index.ts";
import { readChannel, wireChannel } from "./util.ts";
import handle from "./handler.ts";

export interface RequestMessage extends Omit<RequestInit, "body" | "signal"> {
    url: string;
    headers: Record<string, string>;
    hasBody: boolean;
}

export interface ResponseMessage extends ResponseInit {
    url: string;
    headers: Record<string, string>;
    hasBody: boolean;
}

export async function handleRequest(
    reqMsg: RequestMessage,
    channel: Channel<{ value: Uint8Array | undefined, done: boolean; }>
): Promise<ResponseMessage> {
    const { url, hasBody, ...init } = reqMsg;
    const req = new Request(url, {
        ...init,
        body: hasBody ? readChannel(channel) : null,
    });

    const res = await handle(req);

    res.body && wireChannel(res.body, channel);

    return {
        url: res.url,
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        hasBody: !!res.body,
    };
}
