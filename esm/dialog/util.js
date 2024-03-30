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
        const buf = new Uint8Array(3);
        const n = await stdin.read(buf);
        return bytes(buf.slice(0, n !== null && n !== void 0 ? n : 0));
    }
}
async function write(stdout, data) {
    if ("fd" in stdout) {
        return new Promise(resolve => {
            stdout.write(data, () => resolve());
        });
    }
    else {
        return stdout.write(data);
    }
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
                await stdout.write(LEFT);
            }
        }
        else if (equals(char, RIGHT)) {
            if (cursor < buf.length) {
                cursor++;
                await stdout.write(RIGHT);
            }
        }
        else if (char[0] === ESC || char[0] === CANCEL) {
            await stdout.write(bytes([LF]));
            return null;
        }
        else if (char[0] === CR || char[0] === LF) {
            await stdout.write(bytes([LF]));
            return buf.join("");
        }
        else if (char[0] === BS || char[0] === DEL) {
            if (cursor > 0) {
                buf.splice(cursor - 1, 1);
                cursor--;
                const rest = buf.slice(cursor).join("");
                await stdout.write(LEFT);
                await stdout.write(CLR_RIGHT);
                if (rest) {
                    await stdout.write(bytes(rest));
                    await stdout.write(bytes(`\u001b[${rest.length}D`));
                }
            }
        }
        else {
            if (cursor === buf.length) {
                buf.push(String(char));
                cursor++;
                await stdout.write(char);
            }
            else {
                buf.splice(cursor, 0, String(char));
                const rest = buf.slice(cursor + 1).join("");
                cursor++;
                await stdout.write(concat(char, bytes(rest)));
                await stdout.write(bytes(`\u001b[${rest.length}D`));
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
    const answer = await question(stdin, stdout, message, defaultValue);
    stdin.setRawMode(rawMode);
    if (!(await isNodeRepl())) {
        stdin.pause();
    }
    return answer;
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
    const answer = await question(stdin, stdout, message, defaultValue);
    stdin.setRaw(false);
    return answer;
}

export { BS, CANCEL, CLR, CLR_LEFT, CLR_RIGHT, CR, DEL, ESC, LEFT, LF, RIGHT, isDenoRepl, isNodeRepl, questionInDeno, questionInNode, questionInNodeRepl };
//# sourceMappingURL=util.js.map
