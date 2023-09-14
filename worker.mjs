import { isMainThread, parentPort, workerData } from "worker_threads";
import { isAsyncGenerator, isGenerator } from "check-iterable";

/**
 * @param {{type: string; script: string; fn: string; args: any[]}} msg 
 * @param {(reply: { type: string; value?: any; error?: unknown; done?: boolean }) => void} send
 */
async function handleMessage(msg, send) {
    try {
        let module = await import(msg.script);

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
    (async (msg) => {
        if (msg && typeof msg === "object" &&
            msg.type === "ffi" &&
            typeof msg.script === "string" &&
            typeof msg.fn === "string" &&
            Array.isArray(msg.args)
        ) {
            await handleMessage(msg, parentPort.postMessage.bind(parentPort));
        }
    })(workerData);
} else if (process.send) {
    process.on("message", async (msg) => {
        if (msg && typeof msg === "object" &&
            msg.type === "ffi" &&
            typeof msg.script === "string" &&
            typeof msg.fn === "string" &&
            Array.isArray(msg.args)
        ) {
            await handleMessage(msg, process.send?.bind(process));
        }
    });
}
