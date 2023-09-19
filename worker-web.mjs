// @ts-ignore
import { isAsyncGenerator, isGenerator } from "./external/check-iterable/index.mjs";

/** @type {Map<string, any>} */
const cache = new Map();

function isFFIMessage(msg) {
    return msg && typeof msg === "object" &&
        msg.type === "ffi" &&
        typeof msg.script === "string" &&
        typeof msg.fn === "string" &&
        Array.isArray(msg.args);
}

/**
 * @param {{type: string; script: string; baseUrl: string; fn: string; args: any[]}} msg 
 * @param {(reply: { type: string; value?: any; error?: unknown; done?: boolean }) => void} send
 */
async function handleMessage(msg, send) {
    try {
        const url = new URL(msg.script, msg.baseUrl).href;
        let module = cache.get(url);

        if (!module) {
            if (typeof Deno === "object") {
                module = await import(url);
                cache.set(url, module);
            } else {
                try {
                    module = await import(url);
                    cache.set(url, module);
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
                        cache.set(url, module);
                    } else {
                        throw err;
                    }
                }
            }
        }

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

self.onmessage = async ({ data: msg }) => {
    if (isFFIMessage(msg)) {
        await handleMessage(msg, self.postMessage.bind(self));
    }
};
