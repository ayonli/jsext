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
        stdout.write(message);
        if (defaultValue) {
            stdout.write(defaultValue);
            buf.push(...defaultValue);
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
                    if (buf.length) {
                        stdout.moveCursor(-1, 0);
                        stdout.clearLine(1);
                        buf.pop();
                    }
                }
                else if (char !== undefined) {
                    stdout.write(char);
                    buf.push(char);
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
function handleCancel() {
    return new Promise(resolve => {
        process.stdin.on("keypress", (_, key) => {
            if (key.name === "escape" || (key.name === "c" && key.ctrl)) {
                process.stdout.write("\n");
                resolve(null);
            }
        });
    });
}

export { handleCancel, isNodeRepl, questionInRepl };
//# sourceMappingURL=util.js.map
