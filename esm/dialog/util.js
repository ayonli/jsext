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
async function questionInRepl(message, defaultValue = "") {
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
                if (key.name === "escape" || (key.name === "c" && key.ctrl)) {
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
                else if (key.name === "left") {
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
            };
            stdin.on("keypress", listener);
        });
        stdout.write("\n");
        return answer;
    });
}
async function isNodeRepl() {
    var _a;
    const repl = await import('repl');
    // @ts-ignore fix CommonJS import
    return !!((_a = repl.default) !== null && _a !== void 0 ? _a : repl).repl;
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

export { isNodeRepl, listenForCancel, questionInRepl };
//# sourceMappingURL=util.js.map
