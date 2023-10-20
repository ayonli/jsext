import { Channel, id } from "./chan.ts";

declare var Deno: any;
declare var Bun: any;
export const isDeno = typeof Deno === "object";
export const isBun = typeof Bun === "object";
export const isNode = !isDeno && !isBun && typeof process === "object" && !!process.versions?.node;
export const isBeforeNode14 = isNode && parseInt(process.version.slice(1)) < 14;
export const IsPath = /^(\.[\/\\]|\.\.[\/\\]|[a-zA-Z]:|\/)/;

const moduleCache = new Map();
const channelStore = new Map<number, { channel: Channel<any>, raw: Pick<Channel<any>, "push" | "close">; }>();

export async function resolveModule(modId: string, baseUrl: string | undefined = undefined) {
    let module: { [x: string]: any; };

    if (isNode || isBun) {
        const { fileURLToPath } = await import("url");
        const path = baseUrl ? fileURLToPath(new URL(modId, baseUrl).href) : modId;
        module = await import(path);
    } else {
        const url = new URL(modId, baseUrl).href;
        module = moduleCache.get(url);

        if (!module) {
            if (isDeno) {
                module = await import(url);
                moduleCache.set(url, module);
            } else {
                try {
                    module = await import(url);
                    moduleCache.set(url, module);
                } catch (err) {
                    if (String(err).includes("Failed")) {
                        // The content-type of the response isn't application/javascript, try to
                        // download it and load it with object URL.
                        const res = await fetch(url);
                        const buf = await res.arrayBuffer();
                        const blob = new Blob([new Uint8Array(buf)], {
                            type: "application/javascript",
                        });
                        const _url = URL.createObjectURL(blob);

                        module = await import(_url);
                        moduleCache.set(url, module);
                    } else {
                        throw err;
                    }
                }
            }
        }
    }

    if (typeof module["default"] === "object" && typeof module["default"].default !== "undefined") {
        module = module["default"]; // CommonJS module with exports.default
    }

    return module;
}

export type ChannelMessage = {
    type: "push" | "close";
    value?: any;
    channelId: number;
};

export function isChannelMessage(msg: any): msg is ChannelMessage {
    return msg
        && typeof msg === "object"
        && ["push", "close"].includes(msg.type)
        && typeof msg.channelId === "number";
}

export async function handleChannelMessage(msg: ChannelMessage) {
    const channel = channelStore.get(msg.channelId);

    if (!channel)
        return;

    if (msg.type === "push") {
        channel.raw.push(msg.value);
    } else if (msg.type === "close") {
        channel.raw.close(msg.value);
        channelStore.delete(msg.channelId);
    }
}

export function wrapChannel(
    channel: Channel<any>,
    channelWrite: (type: "push" | "close", msg: any, channelId: number) => void
): object {
    const channelId = channel[id] as number;

    if (!channelStore.has(channelId)) {
        const push = channel.push.bind(channel);
        const close = channel.close.bind(channel);

        channelStore.set(channelId, { channel, raw: { push, close } });
    }

    Object.defineProperties(channel, {
        push: {
            configurable: true,
            writable: true,
            value: async (value: any) => {
                if (channel["state"] !== 1) {
                    throw new Error("the channel is closed");
                }

                await Promise.resolve(channelWrite("push", value, channelId));
            },
        },
        close: {
            configurable: true,
            writable: true,
            value: (err: Error | null = null) => {
                const record = channelStore.get(channelId);
                record?.raw.close(err);
                channelWrite("close", err, channelId);
                channelStore.delete(channelId);

                if (record) {
                    // recover to the original methods
                    Object.defineProperties(channel, {
                        push: {
                            configurable: true,
                            writable: true,
                            value: record.raw.push,
                        },
                        close: {
                            configurable: true,
                            writable: true,
                            value: record.raw.close,
                        },
                    });
                }
            },
        },
    });

    return { "@@type": "Channel", "@@id": channelId, "capacity": channel.capacity };
}

export function unwrapChannel(
    obj: { "@@type": "Channel", "@@id": number; capacity?: number; },
    channelWrite: (type: "push" | "close", msg: any, channelId: number) => void
) {
    const channelId = obj["@@id"];
    let record = channelStore.get(channelId);

    if (!record) {
        const channel: Channel<any> = Object.assign(Object.create(Channel.prototype), {
            [id]: channelId,
            capacity: obj.capacity ?? 0,
            buffer: [],
            producers: [],
            consumers: [],
            error: null,
            state: 1,
        });

        if (!channelStore.has(channelId)) {
            const push = channel.push.bind(channel);
            const close = channel.close.bind(channel);
            channelStore.set(channelId, record = { channel, raw: { push, close } });
        }

        Object.defineProperties(channel, {
            push: {
                configurable: true,
                writable: true,
                value: async (value: any) => {
                    if (channel["state"] !== 1) {
                        throw new Error("the channel is closed");
                    }

                    await Promise.resolve(channelWrite("push", value, channelId));
                },
            },
            close: {
                configurable: true,
                writable: true,
                value: (err: Error | null = null) => {
                    const record = channelStore.get(channelId);
                    record?.raw.close(err);
                    channelWrite("close", err, channelId);
                    channelStore.delete(channelId);

                    if (record) {
                        // recover to the original methods
                        Object.defineProperties(channel, {
                            push: {
                                configurable: true,
                                writable: true,
                                value: record.raw.push,
                            },
                            close: {
                                configurable: true,
                                writable: true,
                                value: record.raw.close,
                            },
                        });
                    }
                },
            },
        });
    }

    return record!.channel;
}
