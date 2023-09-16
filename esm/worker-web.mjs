import { isAsyncGenerator, isGenerator } from "https://raw.githubusercontent.com/ayonli/check-iterable/master/index.js" assert { type: "application/javascript" };

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
        const filename = location.origin + "/" + msg.script;
        let module = await import(filename);

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
