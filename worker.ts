import { isAsyncGenerator, isGenerator } from "./external/check-iterable/index.mjs";
import type { CallRequest, CallResponse } from "./parallel.ts";
import {
    isNode,
    resolveModule,
    ChannelMessage,
    isChannelMessage,
    handleChannelMessage,
    unwrapChannel,
    isBun
} from "./util.ts";

declare var Bun: any;
const pendingTasks = new Map<number, AsyncGenerator | Generator>();

function unwrapArgs(
    args: any[],
    channelWrite: (type: "push" | "close", msg: any, channelId: number) => void
) {
    return args.map(arg => {
        if (typeof arg === "object" && arg &&
            (!arg.constructor || arg.constructor === Object) &&
            arg["@@type"] === "Channel" &&
            typeof arg["@@id"] === "number"
        ) {
            return unwrapChannel(arg, channelWrite);
        } else {
            return arg;
        }
    });
}

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
    msg.args = unwrapArgs(msg.args, (type, msg, channelId) => {
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

if (isBun
    && Bun.isMainThread
    && typeof process === "object"
    && typeof process.send === "function"
) { // Bun with child_process
    const reply = process.send.bind(process);
    reply("ready"); // notify the parent process that the worker is ready;
    process.on("message", async (msg) => {
        if (isCallRequest(msg)) {
            await handleCallRequest(msg, reply);
        } else if (isChannelMessage(msg)) {
            handleChannelMessage(msg);
        }
    });
} else if (!isNode && typeof self === "object") {
    const reply = self.postMessage.bind(self);
    self.onmessage = async ({ data: msg }) => {
        if (isCallRequest(msg)) {
            await handleCallRequest(msg, reply);
        } else if (isChannelMessage(msg)) {
            await handleChannelMessage(msg);
        }
    };
}
