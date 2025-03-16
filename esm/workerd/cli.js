import { throwUnsupportedRuntimeError } from '../error.js';
export { args, charWidth, getWindowSize, isTTY, isTypingInput, isWSL, lockStdin, moveLeftBy, moveRightBy, parseArgs, quote, readStdin, stringWidth, writeStdout, writeStdoutSync } from '../cli/common.js';
export { ControlKeys, ControlSequences, FunctionKeys, NavigationKeys } from '../cli/constants.js';

async function run(cmd, args) {
    throwUnsupportedRuntimeError();
}
async function powershell(script) {
    throwUnsupportedRuntimeError();
}
async function sudo(cmd, args, options = {}) {
    throwUnsupportedRuntimeError();
}
async function which(cmd) {
    throwUnsupportedRuntimeError();
}
async function edit(filename) {
    throwUnsupportedRuntimeError();
}

export { edit, powershell, run, sudo, which };
//# sourceMappingURL=cli.js.map
