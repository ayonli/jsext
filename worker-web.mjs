import { isAsyncGenerator, isGenerator } from "./external/check-iterable/index.mjs";
import { fromObject, toObject } from "./esm/error/index.js";

const isNode = typeof process === "object" && !!process.versions?.node;

/** @type {Map<string, any>} */
const moduleCache = new Map();

/** @type {Map<number, AsyncGenerator | Generator>} */
const pendingTasks = new Map();

/**
 * @param {any} msg
 * @returns {msg is import("./run.ts").FFIRequest}
 */
export function isFFIRequest(msg) {
    return msg && typeof msg === "object" &&
        ["ffi", "next", "return", "throw"].includes(msg.type) &&
        typeof msg.script === "string" &&
        typeof msg.fn === "string" &&
        Array.isArray(msg.args);
}

/**
 * @param {import("./run.ts").FFIRequest} msg 
 * @param {(reply: import("./run.ts").FFIResponse) => void} reply
 */
export async function handleMessage(msg, reply) {
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
                        reply({ type: "error", error: toObject(err), taskId: msg.taskId });
                    }
                } else if (msg.type === "return") {
                    try {
                        const res = await task.return(msg.args[0]);
                        reply({ type: "yield", ...res, taskId: msg.taskId });
                    } catch (err) {
                        reply({ type: "error", error: toObject(err), taskId: msg.taskId });
                    }
                } else if (msg.type === "next") {
                    try {
                        const res = await task.next(msg.args[0]);
                        reply({ type: "yield", ...res, taskId: msg.taskId });
                    } catch (err) {
                        reply({ type: "error", error: toObject(err), taskId: msg.taskId });
                    }
                }

                return;
            }
        }

        let module;

        if (isNode) {
            const { fileURLToPath } = await import("url");
            const path = msg.baseUrl
                ? fileURLToPath(new URL(msg.script, msg.baseUrl).href)
                : msg.script;
            module = await import(path);
        } else {
            const url = new URL(msg.script, msg.baseUrl).href;
            module = moduleCache.get(url);

            if (!module) {
                if (typeof Deno === "object") {
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

        if (typeof module.default === "object" && typeof module.default.default !== "undefined") {
            module = module.default; // CommonJS module with exports.default
        }

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
                        reply({ type: "error", error: toObject(err) });
                        break;
                    }
                }
            }
        } else {
            reply({ type: "return", value: returns, taskId: msg.taskId });
        }
    } catch (err) {
        reply({ type: "error", error: toObject(err), taskId: msg.taskId });
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
