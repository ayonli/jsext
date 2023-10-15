import { isMainThread, parentPort } from "worker_threads";
import { handleMessage, isFFIRequest } from "./worker-web.mjs";

if (!isMainThread && parentPort) {
    const reply = parentPort.postMessage.bind(parentPort);
    parentPort.on("message", async (msg) => {
        if (isFFIRequest(msg)) {
            await handleMessage(msg, reply);
        }
    });
} else if (process.send) {
    const reply = process.send.bind(process);
    reply("ready"); // notify the parent process that the worker is ready;
    process.on("message", async (msg) => {
        if (isFFIRequest(msg)) {
            await handleMessage(msg, reply);
        }
    });
}
