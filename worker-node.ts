import { isMainThread, parentPort } from "worker_threads";
import { isChannelMessage, handleChannelMessage, isNode } from "./util.ts";
import { isCallRequest, handleCallRequest } from "./worker.ts";

if (isNode) {
    if (!isMainThread && parentPort) {
        parentPort.on("message", async (msg) => {
            if (isCallRequest(msg)) {
                await handleCallRequest(msg, (res, transferable = []) => {
                    parentPort!.postMessage(res, transferable);
                });
            } else if (isChannelMessage(msg)) {
                handleChannelMessage(msg);
            }
        });
    } else if (process.send) {
        process.send("ready"); // notify the parent process that the worker is ready;
        process.on("message", async (msg) => {
            if (isCallRequest(msg)) {
                await handleCallRequest(msg, (res, _ = []) => {
                    process.send!(res);
                });
            } else if (isChannelMessage(msg)) {
                handleChannelMessage(msg);
            }
        });
    }
}
