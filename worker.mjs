import { isMainThread, parentPort, workerData } from "worker_threads";

if (!isMainThread) {
    (async (msg) => {
        if (msg && typeof msg === "object" &&
            msg.type === "ffi" &&
            typeof msg.script === "string" &&
            typeof msg.fn === "string" &&
            Array.isArray(msg.args)
        ) {
            try {
                const module = await import(msg.script);
                const value = await module[msg.fn](...msg.args);
                parentPort?.postMessage({
                    type: "result",
                    value,
                    error: null,
                });
            } catch (error) {
                parentPort?.postMessage({
                    type: "result",
                    value: undefined,
                    error,
                });
            }
        }
    })(workerData);
} else {
    process.on("message", async (msg) => {
        if (msg && typeof msg === "object" &&
            msg.type === "ffi" &&
            typeof msg.script === "string" &&
            typeof msg.fn === "string" &&
            Array.isArray(msg.args)
        ) {
            try {
                const module = await import(msg.script);
                const value = await module[msg.fn](...msg.args);
                process.send?.({
                    type: "result",
                    value,
                    error: null,
                });
            } catch (error) {
                process.send?.({
                    type: "result",
                    value: undefined,
                    error,
                });
            }
        }
    });
}
