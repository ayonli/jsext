import bytes, { equals, concat } from '../bytes/index.js';
import { sum } from '../math/index.js';
import { chars, byteLength } from '../string/index.js';

const LF = bytes("\n"); // ^J - Enter on Linux
const CR = bytes("\r"); // ^M - Enter on macOS and Windows (CRLF)
const TAB = bytes("\t"); // ^I - Tab
const BS = bytes("\b"); // ^H - Backspace on Linux and Windows
const DEL = bytes([0x7f]); // ^? - Backspace on macOS
const ESC = bytes([0x1b]); // ^[ - Escape
const CANCEL = bytes([0x03]); // ^C - Cancel
const START = bytes([0x01]); // ^A - Start of text
const END = bytes([0x05]); // ^E - End of text
const CLR = bytes("\r\u001b[K"); // Clear the current line
const CLR_RIGHT = bytes("\u001b[0K");
const CLR_LEFT = bytes("\u001b[1K");
const LEFT = bytes("\u001b[D");
const RIGHT = bytes("\u001b[C");
const UP = bytes("\u001b[A");
const DOWN = bytes("\u001b[B");
const WIDE_STR_RE = /^[^\x00-\xff]$/;
const EMOJI_RE = /^(?:\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200d(?:\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*$/u;
function charWith(char) {
    if (EMOJI_RE.test(char)) {
        const _bytes = byteLength(char);
        return _bytes === 1 || _bytes === 3 || _bytes === 6 ? 1 : 2;
    }
    else if (WIDE_STR_RE.test(char)) {
        return 2;
    }
    else {
        return 1;
    }
}
function strWidth(str) {
    return sum(...chars(str).map(charWith));
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
async function question(stdin, stdout, message, defaultValue = "") {
    const buf = [];
    let cursor = 0;
    await write(stdout, bytes(message));
    if (defaultValue) {
        await write(stdout, bytes(defaultValue));
        const _chars = chars(defaultValue);
        buf.push(..._chars);
        cursor += _chars.length;
    }
    while (true) {
        const input = await read(stdin);
        if (!input.length || equals(input, UP) || equals(input, DOWN)) {
            continue;
        }
        else if (equals(input, LEFT)) {
            if (cursor > 0) {
                const char = buf[--cursor];
                await write(stdout, toLeft(char));
            }
        }
        else if (equals(input, RIGHT)) {
            if (cursor < buf.length) {
                const char = buf[cursor++];
                await write(stdout, toRight(char));
            }
        }
        else if (equals(input, START)) {
            const left = buf.slice(0, cursor);
            if (left.length) {
                cursor = 0;
                await write(stdout, toLeft(left.join("")));
            }
        }
        else if (equals(input, END)) {
            const right = buf.slice(cursor);
            if (right.length) {
                cursor = buf.length;
                await write(stdout, toRight(right.join("")));
            }
        }
        else if (isCancelEvent(input)) {
            await write(stdout, LF);
            return null;
        }
        else if (equals(input, CR) || equals(input, LF)) {
            await write(stdout, LF);
            return buf.join("");
        }
        else if (equals(input, BS) || equals(input, DEL)) {
            if (cursor > 0) {
                cursor--;
                const [char] = buf.splice(cursor, 1);
                const rest = buf.slice(cursor);
                await write(stdout, toLeft(char));
                await write(stdout, CLR_RIGHT);
                if (rest.length) {
                    const output = rest.join("");
                    await write(stdout, bytes(output));
                    await write(stdout, toLeft(output));
                }
            }
        }
        else {
            const _chars = chars(String(input));
            if (cursor === buf.length) {
                buf.push(..._chars);
                cursor += _chars.length;
                await write(stdout, input);
            }
            else {
                buf.splice(cursor, 0, ..._chars);
                cursor += _chars.length;
                const rest = buf.slice(cursor).join("");
                await write(stdout, concat(input, bytes(rest)));
                await write(stdout, toLeft(rest));
            }
        }
    }
}
async function hijackStdin(stdin, task) {
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
async function questionInNodeRepl(message, defaultValue = "") {
    return await hijackStdin(process.stdin, async () => {
        return await questionInNode(message, defaultValue);
    });
}
async function questionInNode(message, defaultValue = "") {
    const { stdin, stdout } = process;
    if (!stdout.isTTY) {
        return null;
    }
    if (stdin.isPaused()) {
        stdin.resume();
    }
    const rawMode = stdin.isRaw;
    rawMode || stdin.setRawMode(true);
    try {
        return await question(stdin, stdout, message, defaultValue);
    }
    finally {
        stdin.setRawMode(rawMode);
        if (!(await isNodeRepl())) {
            stdin.pause();
        }
    }
}
function isDenoRepl() {
    return typeof Deno === "object" && Deno.mainModule.endsWith("$deno$repl.ts");
}
async function questionInDeno(message, defaultValue = "") {
    const { stdin, stdout } = Deno;
    if (!stdin.isTerminal()) {
        return null;
    }
    stdin.setRaw(true);
    try {
        return await question(stdin, stdout, message, defaultValue);
    }
    finally {
        stdin.setRaw(false);
    }
}

export { BS, CANCEL, CLR, CLR_LEFT, CLR_RIGHT, CR, DEL, DOWN, EMOJI_RE, END, ESC, LEFT, LF, RIGHT, START, TAB, UP, WIDE_STR_RE, isCancelEvent, isDenoRepl, isNodeRepl, questionInDeno, questionInNode, questionInNodeRepl, read, write, writeSync };
//# sourceMappingURL=util.js.map
