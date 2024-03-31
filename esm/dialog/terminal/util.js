import { isWide, isFullWidth } from '../../external/code-point-utils/index.js';
import bytes, { equals } from '../../bytes/index.js';
import { sum } from '../../math/index.js';
import { chars, byteLength } from '../../string/index.js';
import { ESC, CANCEL, EMOJI_RE } from './constants.js';

function charWidth(char) {
    if (EMOJI_RE.test(char)) {
        const _bytes = byteLength(char);
        return _bytes === 1 || _bytes === 3 || _bytes === 6 ? 1 : 2;
    }
    else if (isWide(char.codePointAt(0)) || isFullWidth(char.codePointAt(0))) {
        return 2;
    }
    else {
        return 1;
    }
}
function strWidth(str) {
    return sum(...chars(str).map(charWidth));
}
function toLeft(str) {
    return bytes(`\u001b[${strWidth(str)}D`);
}
function toRight(str) {
    return bytes(`\u001b[${strWidth(str)}C`);
}
async function read(stdin) {
    if ("fd" in stdin) {
        return new Promise(resolve => {
            stdin.once("data", (chunk) => {
                resolve(bytes(chunk));
            });
        });
    }
    else {
        const reader = stdin.readable.getReader();
        const { done, value } = await reader.read();
        reader.releaseLock();
        if (done) {
            return bytes([]);
        }
        else {
            return bytes(value);
        }
    }
}
async function write(stdout, data) {
    if ("fd" in stdout) {
        await new Promise(resolve => {
            stdout.write(data, () => resolve());
        });
    }
    else {
        await stdout.write(data);
    }
}
function writeSync(stdout, data) {
    if ("fd" in stdout) {
        write(stdout, data);
    }
    else {
        stdout.writeSync(data);
    }
}
function isCancelEvent(buf) {
    return equals(buf, ESC) || equals(buf, CANCEL);
}
async function hijackNodeStdin(stdin, task) {
    const _listeners = stdin.listeners("keypress");
    stdin.removeAllListeners("keypress");
    const result = await task();
    _listeners.forEach(listener => stdin.addListener("keypress", listener));
    return result;
}
async function isNodeRepl() {
    var _a;
    const repl = await import('repl');
    // @ts-ignore fix CommonJS import
    return !!((_a = repl.default) !== null && _a !== void 0 ? _a : repl).repl;
}

export { hijackNodeStdin, isCancelEvent, isNodeRepl, read, toLeft, toRight, write, writeSync };
//# sourceMappingURL=util.js.map
