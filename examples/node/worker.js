import { readChannel, wireChannel } from "./util.js";
import handle from "./handler.js";

/**
 * @typedef {Omit<RequestInit, "body" | "signal"> & {
 *     url: string;
 *     headers: Record<string, string>;
 *     hasBody: boolean;
 * }} RequestMessage
 */

/**
 * @typedef {ResponseInit & {
 *     url: string;
 *     headers: Record<string, string>;
 *     hasBody: boolean;
 * }} ResponseMessage
 */

/**
 * @param {RequestMessage} reqMsg
 * @param {import("../../index.ts").Channel<{ value: Uint8Array | undefined; done: boolean; }>}
 * @returns {Promise<ResponseMessage>}
 */
export async function parallelHandle(reqMsg, channel) {
    const { url, hasBody, ...init } = reqMsg;

    // Rebuild the request object in the worker.
    const req = new Request(url, {
        ...init,
        body: hasBody ? readChannel(channel) : null,
        duplex: "half",
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
