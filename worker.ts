import { isMainThread, parentPort } from "worker_threads";
import { isChannelMessage } from "./util.ts";
import { handleChannelMessage, handleCallRequest, isCallRequest } from "./worker-web.ts";

if (!isMainThread && parentPort) {
    const reply = parentPort.postMessage.bind(parentPort);
    parentPort.on("message", async (msg) => {
        if (isCallRequest(msg)) {
            await handleCallRequest(msg, reply);
        } else if (isChannelMessage(msg)) {
            handleChannelMessage(msg);
        }
    });
} else if (process.send) {
    const reply = process.send.bind(process);
    reply("ready"); // notify the parent process that the worker is ready;
    process.on("message", async (msg) => {
        if (isCallRequest(msg)) {
            await handleCallRequest(msg, reply);
        } else if (isChannelMessage(msg)) {
            handleChannelMessage(msg);
        }
    });
}
