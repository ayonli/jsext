import { as } from "../../esm/json.js";

/**
 * 
 * @param {ReadableStream<Uint8Array>} stream 
 * @param {import("../../index.ts").Channel<{ value: Uint8Array | undefined; done: boolean; }>} channel 
 */
export async function wireChannel(stream, channel) {
    const reader = stream.getReader();

    while (true) {
        let { value, done } = await reader.read();

        await channel.send({ value, done });

        if (done) {
            break;
        }
    }
}

/**
 * 
 * @param {import("../../index.ts").Channel<{ value: Uint8Array | undefined; done: boolean; }>} channel 
 * @param {boolean} closeAfterRead 
 * @returns 
 */
export function readChannel(channel, closeAfterRead = false) {
    return new ReadableStream({
        async start(controller) {
            for await (let { value, done } of channel) {
                if (!(value instanceof Uint8Array)) {
                    if (Buffer.isBuffer(value)) {
                        value = Uint8Array.from(value);
                    } else {
                        value = as(value, Uint8Array);
                    }
                }

                if (done) {
                    controller.close();
                    break;
                } else {
                    controller.enqueue(value);
                }
            }

            if (closeAfterRead) {
                // This will release the channel for GC, only close
                // in the response stream
                channel.close();
            }
        }
    });
}

/**
 * @param {http.IncomingMessage} nReq
 * @returns {Request}
 */
export function incomingMessageToRequest(nReq) {
    return new Request(new URL(nReq.url, "http://" + (nReq.headers["host"] || "localhost:8000")), {
        method: nReq.method,
        headers: nReq.headers,
        body: ["GET", "HEAD", "OPTIONS"].includes(nReq.method) ? null : new ReadableStream({
            async start(controller) {
                for await (const chunk of nReq) {
                    controller.enqueue(chunk);
                }

                controller.close();
            },
        }),
        cache: "no-cache",
        credentials: "include",
        keepalive: false,
        mode: "same-origin",
        redirect: "follow",
        referrer: nReq.headers["referer"],
        duplex: "half",
    });
}

/**
 * @param {Response} res 
 * @param {http.ServerResponse} nRes 
 */
export function pipeResponse(res, nRes) {
    nRes.writeHead(res.status, res.statusText, Object.fromEntries(res.headers.entries()));
    res.body?.pipeTo(new WritableStream({
        write(chunk) {
            nRes.write(chunk);
        },
        close() {
            nRes.end();
        }
    }));
}
