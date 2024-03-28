import bytes, { equals, concat } from '../bytes/index.js';

const LF = "\n".charCodeAt(0); // ^J - Enter on Linux
const CR = "\r".charCodeAt(0); // ^M - Enter on macOS and Windows (CRLF)
const BS = "\b".charCodeAt(0); // ^H - Backspace on Linux and Windows
const DEL = 0x7f; // ^? - Backspace on macOS
const ESC = 0x1b; // ^[ - Escape
const CLR = bytes("\r\u001b[K"); // Clear the current line
const CLR_RIGHT = bytes("\u001b[0K");
const CLR_LEFT = bytes("\u001b[1K");
const LEFT = bytes("\u001b[D");
const RIGHT = bytes("\u001b[C");
async function hijackStdin(stdin, task) {
    const rawMode = stdin.isRaw;
    rawMode || stdin.setRawMode(true);
    const _listeners = stdin.listeners("keypress");
    stdin.removeAllListeners("keypress");
    const result = await task();
    _listeners.forEach(listener => stdin.addListener("keypress", listener));
    stdin.setRawMode(rawMode);
    return result;
}
function listenForCancel() {
    const ctrl = new AbortController();
    const { signal } = ctrl;
    const promise = new Promise(resolve => {
        const listener = (_, key) => {
            if (key.name === "escape" || (key.name === "c" && key.ctrl)) {
                resolve(null);
            }
        };
        process.stdin.on("keypress", listener);
        signal.addEventListener("abort", () => {
            process.stdin.off("keypress", listener);
            resolve(null);
        });
    });
    return {
        signal,
        promise,
        cleanup: () => ctrl.abort(),
    };
}
async function isNodeRepl() {
    var _a;
    const repl = await import('repl');
    // @ts-ignore fix CommonJS import
    return !!((_a = repl.default) !== null && _a !== void 0 ? _a : repl).repl;
}
async function questionInNodeRepl(message, defaultValue = "") {
    const { stdin, stdout } = process;
    return await hijackStdin(stdin, async () => {
        const buf = [];
        let cursor = 0;
        stdout.write(message);
        if (defaultValue) {
            stdout.write(defaultValue);
            buf.push(...defaultValue);
            cursor += defaultValue.length;
        }
        const answer = await new Promise(resolve => {
            const listener = (char, key) => {
                if (key.name === "left") {
                    if (cursor > 0) {
                        stdout.moveCursor(-1, 0);
                        cursor--;
                    }
                }
                else if (key.name === "right") {
                    if (cursor < buf.length) {
                        stdout.moveCursor(1, 0);
                        cursor++;
                    }
                }
                else if (key.name === "escape" || (key.name === "c" && key.ctrl)) {
                    stdin.off("keypress", listener);
                    resolve(null);
                }
                else if (key.name === "enter" || key.name === "return") {
                    stdin.off("keypress", listener);
                    resolve(buf.join(""));
                }
                else if (key.name === "backspace") {
                    if (cursor > 0) {
                        buf.splice(cursor - 1, 1);
                        cursor--;
                        const rest = buf.slice(cursor).join("");
                        stdout.moveCursor(-1, 0);
                        stdout.clearLine(1);
                        stdout.write(rest);
                        stdout.moveCursor(-rest.length, 0);
                    }
                }
                else if (char !== undefined) {
                    if (cursor === buf.length) {
                        stdout.write(char);
                        buf.push(char);
                        cursor++;
                    }
                    else {
                        buf.splice(cursor, 0, char);
                        const rest = buf.slice(cursor + 1).join("");
                        stdout.write(char + rest);
                        cursor++;
                        stdout.moveCursor(-rest.length, 0);
                    }
                }
            };
            stdin.on("keypress", listener);
        });
        stdout.write("\n");
        return answer;
    });
}
function isDenoRepl() {
    return typeof Deno === "object" && Deno.mainModule.endsWith("$deno$repl.ts");
}
async function questionInDeno(message, defaultValue = "") {
    const { stdin, stdout } = Deno;
    if (!stdin.isTerminal()) {
        return null;
    }
    stdin.setRaw(true, { cbreak: true });
    const input = new Uint8Array(3);
    const buf = [];
    let cursor = 0;
    await stdout.write(bytes(message));
    if (defaultValue) {
        await stdout.write(bytes(defaultValue));
        buf.push(...defaultValue);
        cursor += defaultValue.length;
    }
    while (true) {
        const n = await stdin.read(input);
        const char = bytes(input.slice(0, n !== null && n !== void 0 ? n : 0));
        if (equals(char, LEFT)) {
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
        else if (n !== 1) {
            continue;
        }
        else if (char[0] === ESC) {
            stdin.setRaw(false);
            return null;
        }
        else if (char[0] === CR || char[0] === LF) {
            await stdout.write(bytes([LF]));
            stdin.setRaw(false);
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

export { BS, CLR, CLR_LEFT, CLR_RIGHT, CR, DEL, ESC, LEFT, LF, RIGHT, isDenoRepl, isNodeRepl, listenForCancel, questionInDeno, questionInNodeRepl };
//# sourceMappingURL=util.js.map
