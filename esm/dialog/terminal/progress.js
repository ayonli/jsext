import bytes from '../../bytes.js';
import { stripEnd } from '../../string.js';
import { CLR, LF } from './constants.js';
import { hijackNodeStdin, writeSync, isCancelEvent } from './util.js';

async function handleTerminalProgress(stdin, stdout, message, fn, options) {
    const { signal, abort, listenForAbort } = options;
    writeSync(stdout, bytes(message));
    let lastMessage = stripEnd(message, "...");
    let lastPercent = undefined;
    let waitingIndicator = message.endsWith("...") ? "..." : "";
    const waitingTimer = setInterval(() => {
        if (waitingIndicator === "...") {
            waitingIndicator = ".";
        }
        else {
            waitingIndicator += ".";
        }
        writeSync(stdout, CLR);
        writeSync(stdout, bytes(lastMessage + waitingIndicator));
    }, 1000);
    const set = (state) => {
        if (signal.aborted) {
            return;
        }
        writeSync(stdout, CLR);
        if (state.message) {
            lastMessage = state.message;
        }
        if (state.percent !== undefined) {
            lastPercent = state.percent;
        }
        writeSync(stdout, bytes(lastMessage));
        if (lastPercent !== undefined) {
            const percentage = " ... " + lastPercent + "%";
            writeSync(stdout, bytes(percentage));
            clearInterval(waitingTimer);
        }
    };
    const nodeReader = (buf) => {
        if (isCancelEvent(buf)) {
            abort === null || abort === void 0 ? void 0 : abort();
        }
    };
    const denoReader = "fd" in stdin ? null : stdin.readable.getReader();
    if (abort) {
        if ("fd" in stdin) {
            stdin.on("data", nodeReader);
        }
        else {
            (async () => {
                while (true) {
                    try {
                        const { done, value } = await denoReader.read();
                        if (done || isCancelEvent(value)) {
                            signal.aborted || abort();
                            break;
                        }
                    }
                    catch (_a) {
                        signal.aborted || abort();
                        break;
                    }
                }
            })();
        }
    }
    let job = fn(set, signal);
    if (listenForAbort) {
        job = Promise.race([job, listenForAbort()]);
    }
    try {
        return await job;
    }
    finally {
        writeSync(stdout, LF);
        clearInterval(waitingTimer);
        if ("fd" in stdin) {
            stdin.off("data", nodeReader);
        }
        else {
            denoReader === null || denoReader === void 0 ? void 0 : denoReader.releaseLock();
        }
    }
}
async function progressInDeno(message, fn, options) {
    const { stdin, stdout } = Deno;
    if (!stdin.isTerminal) {
        return null;
    }
    try {
        stdin.setRaw(true);
        return await handleTerminalProgress(stdin, stdout, message, fn, options);
    }
    finally {
        stdin.setRaw(false);
    }
}
async function progressInNode(message, fn, options) {
    const { stdin, stdout } = process;
    if (!stdout.isTTY) {
        return null;
    }
    return hijackNodeStdin(stdin, async () => {
        try {
            stdin.setRawMode(true);
            return await handleTerminalProgress(stdin, stdout, message, fn, options);
        }
        finally {
            stdin.setRawMode(false);
        }
    });
}

export { progressInDeno, progressInNode };
//# sourceMappingURL=progress.js.map
