import { isAsyncGenerator, isGenerator } from "./external/check-iterable/index.mjs";
import { toObject } from "./error/index.ts";
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
    return msg && typeof msg === "object"
        && ((msg.type === "call" && typeof msg.module === "string" && typeof msg.fn === "string") ||
            (["next", "return", "throw"].includes(msg.type) && typeof msg.taskId === "number"))
        && Array.isArray(msg.args);
}

export async function handleCallRequest(
    msg: CallRequest,
    reply: (res: CallResponse | ChannelMessage) => void
) {
    const _reply = reply;
    reply = (res) => {
        if (res.type === "error") {
            if (isNode && process.argv.includes("--serialization=json")) {
                return _reply({
                    ...res,
                    error: toObject(res.error as Error)
                } as CallResponse | ChannelMessage);
            }

            if (typeof DOMException === "function" && res.error instanceof DOMException) {
                // DOMException cannot be cloned properly, fallback to transferring it as
                // an object and rebuild in the main thread.
                return _reply({
                    ...res,
                    error: {
                        ...toObject(res.error as Error),
                        // In Node.js, the default name of DOMException is incorrect,
                        // we need to set it right.
                        name: "DOMException",
                    },
                } as CallResponse | ChannelMessage);
            }

            try {
                return _reply(res);
            } catch {
                // In case the error cannot be cloned directly, fallback to transferring it as
                // an object and rebuild in the main thread.
                return _reply({
                    ...res,
                    error: toObject(res.error as Error)
                } as CallResponse | ChannelMessage);
            }
        } else {
            return _reply(res);
        }
    };

    msg.args = unwrapArgs(msg.args, (type, msg, channelId) => {
        reply({ type, value: msg, channelId } satisfies ChannelMessage);
    });

    try {
        if (msg.taskId && ["next", "return", "throw"].includes(msg.type)) {
            const req = msg as {
                type: | "next" | "return" | "throw";
                args: any[];
                taskId: number;
            };
            const task = pendingTasks.get(req.taskId);

            if (task) {
                if (req.type === "throw") {
                    try {
                        await task.throw(req.args[0]);
                    } catch (error) {
                        reply({ type: "error", error, taskId: req.taskId });
                    }
                } else if (req.type === "return") {
                    try {
                        const res = await task.return(req.args[0]);
                        reply({ type: "yield", ...res, taskId: req.taskId });
                    } catch (error) {
                        reply({ type: "error", error, taskId: req.taskId });
                    }
                } else { // req.type === "next"
                    try {
                        const res = await task.next(req.args[0]);
                        reply({ type: "yield", ...res, taskId: req.taskId });
                    } catch (error) {
                        reply({ type: "error", error, taskId: req.taskId });
                    }
                }
            } else {
                reply({
                    type: "error",
                    error: new ReferenceError(`task (${req.taskId}) doesn't exists`),
                    taskId: req.taskId,
                });
            }

            return;
        }

        const req = msg as {
            type: "call";
            module: string;
            fn: string;
            args: any[];
            taskId?: number | undefined;
        };
        const module = await resolveModule(req.module);
        const returns = await module[req.fn](...req.args);

        if (isAsyncGenerator(returns) || isGenerator(returns)) {
            if (req.taskId) {
                pendingTasks.set(req.taskId, returns);
                reply({ type: "gen", taskId: req.taskId });
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
            reply({ type: "return", value: returns, taskId: req.taskId });
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
