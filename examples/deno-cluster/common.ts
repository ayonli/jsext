import type { Channel } from "../../index.ts";

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

export async function wireChannel<T = Uint8Array>(
    stream: ReadableStream<T>,
    channel: Channel<{ value: T | undefined; done: boolean; }>
) {
    const reader = stream.getReader();

    while (true) {
        const { value, done } = await reader.read();

        await channel.push({ value, done });

        if (done) {
            break;
        }
    }
}

export function readChannel<T = Uint8Array>(
    channel: Channel<{ value: T | undefined; done: boolean; }>
) {
    return new ReadableStream({
        async start(controller) {
            for await (const { value, done } of channel) {
                if (done) {
                    controller.close();
                    break;
                } else {
                    controller.enqueue(value as Uint8Array);
                }
            }
        }
    });
}
