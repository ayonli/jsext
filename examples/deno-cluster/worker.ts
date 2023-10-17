import type { Channel } from "../../index.ts";
import { readChannel, wireChannel, type RequestMessage, type ResponseMessage } from "./common.ts";

export async function handleRequest(
    reqMsg: RequestMessage,
    channel: Channel<{ value: Uint8Array | undefined, done: boolean; }>
): Promise<ResponseMessage> {
    const { url, hasBody, ...init } = reqMsg;
    const req = new Request(url, {
        ...init,
        body: hasBody ? readChannel(channel) : null,
    });

    const text = await req.text();
    const res = new Response("The client sent: " + text);

    res.body && wireChannel(res.body, channel);

    return {
        url: res.url,
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        hasBody: !!res.body,
    };
}
