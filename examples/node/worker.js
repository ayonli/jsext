import { readChannel, wireChannel } from "./util.js";
import handle from "./handler.js";

/**
 * @typedef {Omit<RequestInit, "body" | "signal"> & {
 *     url: string;
 *     headers: Record<string, string>;
 *     streamBody?: boolean;
 *     body?: ArrayBuffer | null;
 * }} RequestMessage
 */

/**
 * @typedef {ResponseInit & {
 *     url: string;
 *     headers: Record<string, string>;
 *     streamBody?: boolean;
 *     body?: ArrayBuffer | null;
 * }} ResponseMessage
 */

/**
 * @param {RequestMessage} reqMsg
 * @param {import("../../index.ts").Channel<{ value: Uint8Array | undefined; done: boolean; }>}
 * @returns {Promise<ResponseMessage>}
 */
export async function parallelHandle(reqMsg, channel) {
    const { url, streamBody, body, ...init } = reqMsg;

    // Rebuild the request object in the worker.
    const req = new Request(url, {
        ...init,
        body: streamBody && channel ? readChannel(channel) : (body ?? null),
        duplex: "half",
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
