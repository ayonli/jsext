import { isAsyncGenerator, isGenerator } from "./external/check-iterable/index.mjs";
import { fromObject, toObject } from "./error/index.ts";
import { isNode, resolveModule } from "./util.ts";
import type { FFIRequest, FFIResponse } from "./parallel.ts";

const pendingTasks = new Map<number, AsyncGenerator | Generator>();

export function isFFIRequest(msg: any): msg is FFIRequest {
    return msg && typeof msg === "object" &&
        ["ffi", "next", "return", "throw"].includes(msg.type) &&
        typeof msg.script === "string" &&
        typeof msg.fn === "string" &&
        Array.isArray(msg.args);
}

export async function handleMessage(msg: FFIRequest, reply: (res: FFIResponse) => void) {
    try {
        if (msg.taskId) {
            const task = pendingTasks.get(msg.taskId);

            if (task) {
                if (msg.type === "throw") {
                    try {
                        const err = msg.args[0] instanceof Error
                            ? msg.args[0]
                            : fromObject(msg.args[0]);
                        await task.throw(err);
                    } catch (err) {
                        reply({ type: "error", error: toObject(err as Error), taskId: msg.taskId });
                    }
                } else if (msg.type === "return") {
                    try {
                        const res = await task.return(msg.args[0]);
                        reply({ type: "yield", ...res, taskId: msg.taskId });
                    } catch (err) {
                        reply({ type: "error", error: toObject(err as Error), taskId: msg.taskId });
                    }
                } else if (msg.type === "next") {
                    try {
                        const res = await task.next(msg.args[0]);
                        reply({ type: "yield", ...res, taskId: msg.taskId });
                    } catch (err) {
                        reply({ type: "error", error: toObject(err as Error), taskId: msg.taskId });
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
                    } catch (err) {
                        reply({ type: "error", error: toObject(err as Error) });
                        break;
                    }
                }
            }
        } else {
            reply({ type: "return", value: returns, taskId: msg.taskId });
        }
    } catch (err) {
        reply({ type: "error", error: toObject(err as Error), taskId: msg.taskId });
    }
}

if (typeof self === "object" && !isNode) {
    const reply = self.postMessage.bind(self);
    self.onmessage = async ({ data: msg }) => {
        if (isFFIRequest(msg)) {
            await handleMessage(msg, reply);
        }
    };
}
