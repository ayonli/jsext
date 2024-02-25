import { Channel, id } from "./chan.ts";

declare var Deno: any;
declare var Bun: any;
export const isDeno = typeof Deno === "object";
export const isBun = typeof Bun === "object";
export const isNode = !isDeno && !isBun && typeof process === "object" && !!process.versions?.node;
export const isBeforeNode14 = isNode && parseInt(process.version.slice(1)) < 14;
export const isTsx = isNode && process.env["npm_lifecycle_script"]?.match(/\btsx\b/) ? true : false;
export const IsPath = /^(\.[\/\\]|\.\.[\/\\]|[a-zA-Z]:|\/)/;
declare var WorkerGlobalScope: any;

// In Node.js, `process.argv` contains `--worker-thread` when the current thread is used as
// a worker.
const isNodeWorkerThread = isNode && process.argv.includes("--worker-thread");
export const isMainThread = !isNodeWorkerThread
    && (isBun ? (Bun.isMainThread as boolean) : typeof WorkerGlobalScope === "undefined");

const moduleCache = new Map();
const channelStore = new Map<number, {
    channel: Channel<any>,
    raw: Pick<Channel<any>, "push" | "close">;
    writers: Array<(type: "push" | "close", msg: any, channelId: number) => void>,
    counter: number;
}>();

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
    const record = channelStore.get(msg.channelId);

    if (!record)
        return;

    if (msg.type === "push") {
        await record.raw.push(msg.value);
    } else if (msg.type === "close") {
        const { value: err, channelId } = msg;
        record.raw.close(err);
        channelStore.delete(channelId);

        if (isMainThread && record.writers.length > 1) {
            // distribute the channel close event to all threads
            record.writers.forEach(write => {
                write("close", err, channelId);
            });
        }
    }
}

function wireChannel(
    channel: Channel<any>,
    channelWrite: (type: "push" | "close", msg: any, channelId: number) => void
) {
    const channelId = channel[id] as number;

    if (!channelStore.has(channelId)) {
        const push = channel.push.bind(channel);
        const close = channel.close.bind(channel);

        channelStore.set(channelId, {
            channel,
            raw: { push, close },
            writers: [channelWrite],
            counter: 0,
        });

        Object.defineProperties(channel, {
            push: {
                configurable: true,
                writable: true,
                value: async (data: any) => {
                    const record = channelStore.get(channelId);

                    if (record) {
                        const channel = record.channel;

                        if (channel["state"] !== 1) {
                            throw new Error("the channel is closed");
                        }

                        const write = record.writers[record.counter++ % record.writers.length];
                        await Promise.resolve(write!("push", data, channelId));
                    }
                },
            },
            close: {
                configurable: true,
                writable: true,
                value: (err: Error | null = null) => {
                    const record = channelStore.get(channelId);

                    if (record) {
                        channelStore.delete(channelId);
                        const channel = record.channel;

                        record.writers.forEach(write => {
                            write("close", err, channelId);
                        });

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

                        channel.close(err);
                    }
                },
            },
        });
    } else {
        const record = channelStore.get(channelId);
        record!.writers.push(channelWrite);
    }
}

export function wrapChannel(
    channel: Channel<any>,
    channelWrite: (type: "push" | "close", msg: any, channelId: number) => void
): object {
    wireChannel(channel, channelWrite);
    return { "@@type": "Channel", "@@id": channel[id], "capacity": channel.capacity };
}

export function unwrapChannel(
    obj: { "@@type": "Channel", "@@id": number; capacity?: number; },
    channelWrite: (type: "push" | "close", msg: any, channelId: number) => void
): Channel<any> {
    const channelId = obj["@@id"];
    let channel = channelStore.get(channelId)?.channel;

    if (!channel) {
        channel = Object.assign(Object.create(Channel.prototype), {
            [id]: channelId,
            capacity: obj.capacity ?? 0,
            buffer: [],
            producers: [],
            consumers: [],
            error: null,
            state: 1,
        });
    }

    wireChannel(channel as Channel<any>, channelWrite);

    return channel as Channel<any>;
}
