/**
 * 
 * @param {ReadableStream<Uint8Array>} stream 
 * @param {import("../../index.ts").Channel<{ value: Uint8Array | undefined; done: boolean; }>} channel 
 */
export async function wireChannel(stream, channel) {
    const reader = stream.getReader();

    while (true) {
        const { value, done } = await reader.read();

        await channel.push({ value, done });

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
            for await (const { value, done } of channel) {
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
