import '../bytes.js';
import '../error/Exception.js';
import '../external/event-target-polyfill/index.js';
import { NotImplementedError } from '../error/common.js';
export { args, charWidth, getWindowSize, isTTY, isTypingInput, isWSL, lockStdin, moveLeftBy, moveRightBy, parseArgs, quote, readStdin, stringWidth, writeStdout, writeStdoutSync } from '../cli/common.js';
export { ControlKeys, ControlSequences, FunctionKeys, NavigationKeys } from '../cli/constants.js';

async function run(cmd, args) {
    throw new NotImplementedError("Unsupported runtime");
}
async function powershell(script) {
    throw new NotImplementedError("Unsupported runtime");
}
async function sudo(cmd, args, options = {}) {
    throw new NotImplementedError("Unsupported runtime");
}
async function which(cmd) {
    throw new NotImplementedError("Unsupported runtime");
}
async function edit(filename) {
    throw new NotImplementedError("Unsupported runtime");
}

export { edit, powershell, run, sudo, which };
//# sourceMappingURL=cli.js.map
