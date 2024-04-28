export { CommonPlatforms, args, charWidth, getWindowSize, isTTY, isTypingInput, isWSL, lockStdin, moveLeftBy, moveRightBy, parseArgs, quote, readStdin, stringWidth, writeStdout, writeStdoutSync } from './common.js';
export { ControlKeys, ControlSequences, FunctionKeys, NavigationKeys } from './constants.js';

/**
 * Function stubs for Cloudflare Workers.
 * @module
 */
async function run(cmd, args) {
    throw new Error("Unsupported runtime");
}
async function powershell(script) {
    throw new Error("Unsupported runtime");
}
async function sudo(cmd, args, options = {}) {
    throw new Error("Unsupported runtime");
}
async function which(cmd) {
    throw new Error("Unsupported runtime");
}
async function edit(filename) {
    throw new Error("Unsupported runtime");
}

export { edit, powershell, run, sudo, which };
//# sourceMappingURL=workerd.js.map
