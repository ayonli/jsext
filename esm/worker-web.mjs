import { isAsyncGenerator, isGenerator } from "https://deno.land/x/check_iterable/index.js";

function isFFIMessage(msg) {
    return msg && typeof msg === "object" &&
        msg.type === "ffi" &&
        typeof msg.script === "string" &&
        typeof msg.fn === "string" &&
        Array.isArray(msg.args);
}

/**
 * @param {{type: string; script: string; fn: string; args: any[]}} msg 
 * @param {(reply: { type: string; value?: any; error?: unknown; done?: boolean }) => void} send
 */
async function handleMessage(msg, send) {
    try {
        let baseUrl = location.href;

        if (baseUrl.startsWith("blob:")) {
            baseUrl = baseUrl.slice(5);
        }

        let url = new URL(msg.script, baseUrl);
        let module;

        try {
            module = await import(url);
        } catch (err) {
            if (String(err).includes("Failed")) {
                // The content-type of the response isn't application/javascript, try to download it
                // and load it with object URL.
                const res = await fetch(url);
                const buf = await res.arrayBuffer();
                const blob = new Blob([new Uint8Array(buf)], { type: "application/javascript" });

                const _url = URL.createObjectURL(blob);
                module = await import(_url);
            } else {
                throw err;
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
