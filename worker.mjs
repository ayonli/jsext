import { resolve } from "path";
import { isMainThread, parentPort } from "worker_threads";
// @ts-ignore
import { isAsyncGenerator, isGenerator } from "./external/check-iterable/index.mjs";

/**
 * @typedef {{type: string; script: string; baseUrl: string; fn: string; args: any[]}} FFIMessage
 */

/**
 * @param {any} msg
 * @returns {msg is FFIMessage}
 */
function isFFIMessage(msg) {
    return msg && typeof msg === "object" &&
        msg.type === "ffi" &&
        typeof msg.script === "string" &&
        typeof msg.fn === "string" &&
        Array.isArray(msg.args);
}

/**
 * @param {FFIMessage} msg 
 * @param {(reply: { type: string; value?: any; error?: unknown; done?: boolean | undefined }) => void} send
 */
async function handleMessage(msg, send) {
    try {
        let module = await import(resolve(process.cwd(), msg.script));

        if (typeof module.default === "object" && typeof module.default.default === "function") {
            module = module.default; // CommonJS module
        }

        const returns = await module[msg.fn](...msg.args);

        if (isAsyncGenerator(returns) || isGenerator(returns)) {
            while (true) {
                try {
                    const { value, done } = await returns.next();
                    send({ type: "yield", value, done });

                    if (done) {
                        break;
                    }
                } catch (err) {
                    send({ type: "error", error: err });
                    break;
                }
            }
        } else {
            send({ type: "return", value: returns });
        }
    } catch (error) {
        send({ type: "error", error });
    }
}

if (!isMainThread && parentPort) {
    const send = parentPort.postMessage.bind(parentPort);
    parentPort.on("message", async (msg) => {
        if (isFFIMessage(msg)) {
            await handleMessage(msg, send);
        }
    });
} else if (process.send) {
    const send = process.send.bind(process);
    send("ready"); // notify the parent process that the worker is ready;
    process.on("message", async (msg) => {
        if (isFFIMessage(msg)) {
            await handleMessage(msg, send);
        }
    });
}
