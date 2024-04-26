import bytes, { equals } from '../../bytes.js';
import { stripEnd } from '../../string.js';
import { writeStdoutSync } from '../../cli.js';
import { ControlKeys, ControlSequences } from '../../cli/constants.js';

const { CTRL_C, ESC, LF } = ControlKeys;
const { CLR } = ControlSequences;
async function handleTerminalProgress(message, fn, options) {
    const { signal, abort, listenForAbort } = options;
    writeStdoutSync(bytes(message));
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
        writeStdoutSync(CLR);
        writeStdoutSync(bytes(lastMessage + waitingIndicator));
    }, 1000);
    const set = (state) => {
        if (signal.aborted) {
            return;
        }
        writeStdoutSync(CLR);
        if (state.message) {
            lastMessage = state.message;
        }
        if (state.percent !== undefined) {
            lastPercent = state.percent;
        }
        writeStdoutSync(bytes(lastMessage));
        if (lastPercent !== undefined) {
            const percentage = " ... " + lastPercent + "%";
            writeStdoutSync(bytes(percentage));
            clearInterval(waitingTimer);
        }
    };
    const nodeReader = typeof Deno === "object" ? null : (buf) => {
        if (equals(buf, ESC) || equals(buf, CTRL_C)) {
            abort === null || abort === void 0 ? void 0 : abort();
        }
    };
    const denoReader = typeof Deno === "object" ? Deno.stdin.readable.getReader() : null;
    if (abort) {
        if (nodeReader) {
            process.stdin.on("data", nodeReader);
        }
        else if (denoReader) {
            (async () => {
                while (true) {
                    try {
                        const { done, value } = await denoReader.read();
                        if (done || equals(value, ESC) || equals(value, CTRL_C)) {
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
        writeStdoutSync(LF);
        clearInterval(waitingTimer);
        if (nodeReader) {
            process.stdin.off("data", nodeReader);
        }
        else if (denoReader) {
            denoReader.releaseLock();
        }
    }
}

export { handleTerminalProgress };
//# sourceMappingURL=progress.js.map
