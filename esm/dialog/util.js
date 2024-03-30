import bytes, { equals, concat } from '../bytes/index.js';

const LF = "\n".charCodeAt(0); // ^J - Enter on Linux
const CR = "\r".charCodeAt(0); // ^M - Enter on macOS and Windows (CRLF)
const BS = "\b".charCodeAt(0); // ^H - Backspace on Linux and Windows
const DEL = 0x7f; // ^? - Backspace on macOS
const ESC = 0x1b; // ^[ - Escape
const CANCEL = 0x03; // ^C - Cancel
const CLR = bytes("\r\u001b[K"); // Clear the current line
const CLR_RIGHT = bytes("\u001b[0K");
const CLR_LEFT = bytes("\u001b[1K");
const LEFT = bytes("\u001b[D");
const RIGHT = bytes("\u001b[C");
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
function isCancelSequence(buf) {
    return buf.length === 1 && (buf[0] === ESC || buf[0] === CANCEL);
}
async function question(stdin, stdout, message, defaultValue = "") {
    const buf = [];
    let cursor = 0;
    await write(stdout, bytes(message));
    if (defaultValue) {
        await write(stdout, bytes(defaultValue));
        buf.push(...defaultValue);
        cursor += defaultValue.length;
    }
    while (true) {
        const char = await read(stdin);
        if (!char.length) {
            continue;
        }
        else if (equals(char, LEFT)) {
            if (cursor > 0) {
                cursor--;
                await write(stdout, LEFT);
            }
        }
        else if (equals(char, RIGHT)) {
            if (cursor < buf.length) {
                cursor++;
                await write(stdout, RIGHT);
            }
        }
        else if (isCancelSequence(char)) {
            await write(stdout, bytes([LF]));
            return null;
        }
        else if (char[0] === CR || char[0] === LF) {
            await write(stdout, bytes([LF]));
            return buf.join("");
        }
        else if (char[0] === BS || char[0] === DEL) {
            if (cursor > 0) {
                buf.splice(cursor - 1, 1);
                cursor--;
                const rest = buf.slice(cursor).join("");
                await write(stdout, LEFT);
                await write(stdout, CLR_RIGHT);
                if (rest) {
                    await write(stdout, bytes(rest));
                    await write(stdout, bytes(`\u001b[${rest.length}D`));
                }
            }
        }
        else {
            if (cursor === buf.length) {
                buf.push(String(char));
                cursor++;
                await write(stdout, char);
            }
            else {
                buf.splice(cursor, 0, String(char));
                const rest = buf.slice(cursor + 1).join("");
                cursor++;
                await write(stdout, concat(char, bytes(rest)));
                await write(stdout, bytes(`\u001b[${rest.length}D`));
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

export { BS, CANCEL, CLR, CLR_LEFT, CLR_RIGHT, CR, DEL, ESC, LEFT, LF, RIGHT, isCancelSequence, isDenoRepl, isNodeRepl, questionInDeno, questionInNode, questionInNodeRepl, read, write, writeSync };
//# sourceMappingURL=util.js.map
