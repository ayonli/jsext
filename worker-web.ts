import { isAsyncGenerator, isGenerator } from "./external/check-iterable/index.mjs";
import { isNode, resolveModule, isChannelMessage, type ChannelMessage } from "./util.ts";
import type { CallRequest, CallResponse } from "./parallel.ts";
import { Channel, id } from "./chan.ts";

const pendingTasks = new Map<number, AsyncGenerator | Generator>();
const channelStore = new Map<number, { channel: Channel<any>, raw: Pick<Channel<any>, "push" | "close">; }>();

export function isCallRequest(msg: any): msg is CallRequest {
    return msg && typeof msg === "object" &&
        ["call", "next", "return", "throw"].includes(msg.type) &&
        typeof msg.script === "string" &&
        typeof msg.fn === "string" &&
        Array.isArray(msg.args);
}

export async function handleCallRequest(
    msg: CallRequest,
    reply: (res: CallResponse | ChannelMessage) => void
) {
    msg.args = processArgs(msg.args, (type, msg, channelId) => {
        reply({ type, value: msg, channelId } satisfies ChannelMessage);
    });

    try {
        if (msg.taskId) {
            const task = pendingTasks.get(msg.taskId);

            if (task) {
                if (msg.type === "throw") {
                    try {
                        await task.throw(msg.args[0]);
                    } catch (error) {
                        reply({ type: "error", error, taskId: msg.taskId });
                    }
                } else if (msg.type === "return") {
                    try {
                        const res = await task.return(msg.args[0]);
                        reply({ type: "yield", ...res, taskId: msg.taskId });
                    } catch (error) {
                        reply({ type: "error", error, taskId: msg.taskId });
                    }
                } else if (msg.type === "next") {
                    try {
                        const res = await task.next(msg.args[0]);
                        reply({ type: "yield", ...res, taskId: msg.taskId });
                    } catch (error) {
                        reply({ type: "error", error, taskId: msg.taskId });
                    }
                }

                return;
            }
        }

        const module = await resolveModule(msg.script, msg.baseUrl);
        const returns = await module[msg.fn](...msg.args);

        if (isAsyncGenerator(returns) || isGenerator(returns)) {
            if (msg.taskId) {
                pendingTasks.set(msg.taskId, returns);
                reply({ type: "gen", taskId: msg.taskId });
            } else {
                while (true) {
                    try {
                        const { value, done } = await returns.next();
                        reply({ type: "yield", value, done });

                        if (done) {
                            break;
                        }
                    } catch (error) {
                        reply({ type: "error", error });
                        break;
                    }
                }
            }
        } else {
            reply({ type: "return", value: returns, taskId: msg.taskId });
        }
    } catch (error) {
        reply({ type: "error", error, taskId: msg.taskId });
    }
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

function processArgs(
    args: any[],
    channelWrite: (type: "push" | "close", msg: any, channelId: number) => void
) {
    return args.map(arg => {
        if (typeof arg === "object" && arg &&
            (!arg.constructor || arg.constructor === Object) &&
            arg["@@type"] === "Channel" &&
            typeof arg["@@id"] === "number"
        ) {
            const channelId = arg["@@id"];
            let record = channelStore.get(channelId);

            if (!record) {
                const channel: Channel<any> = Object.assign(Object.create(Channel.prototype), {
                    [id]: channelId,
                    capacity: arg.capacity ?? 0,
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
        } else {
            return arg;
        }
    });
}

if (typeof self === "object" && !isNode) {
    const reply = self.postMessage.bind(self);
    self.onmessage = async ({ data: msg }) => {
        if (isCallRequest(msg)) {
            await handleCallRequest(msg, reply);
        } else if (isChannelMessage(msg)) {
            await handleChannelMessage(msg);
        }
    };
}
