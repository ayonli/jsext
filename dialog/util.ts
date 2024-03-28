export type KeypressEventInfo = {
    sequence: string;
    name: string;
    ctrl: boolean;
    meta: boolean;
    shift: boolean;
};

type NodeStdin = NodeJS.ReadStream & { fd: 0; };

async function hijackStdin<T>(stdin: NodeStdin, task: () => Promise<T>) {
    const rawMode = stdin.isRaw;
    rawMode || stdin.setRawMode(true);

    const _listeners = stdin.listeners("keypress");
    stdin.removeAllListeners("keypress");

    const result = await task();

    _listeners.forEach(listener => stdin.addListener("keypress", listener as any));
    stdin.setRawMode(rawMode);

    return result;
}

export async function questionInRepl(
    message: string,
    defaultValue = ""
): Promise<string | null> {
    const { stdin, stdout } = process;

    return await hijackStdin(stdin, async () => {
        const buf: string[] = [];
        let cursor = 0;

        stdout.write(message);

        if (defaultValue) {
            stdout.write(defaultValue);
            buf.push(...defaultValue);
            cursor += defaultValue.length;
        }

        const answer = await new Promise<string | null>(resolve => {
            const listener = (char: string | undefined, key: KeypressEventInfo) => {
                if (key.name === "escape" || (key.name === "c" && key.ctrl)) {
                    stdin.off("keypress", listener);
                    resolve(null);
                } else if (key.name === "enter" || key.name === "return") {
                    stdin.off("keypress", listener);
                    resolve(buf.join(""));
                } else if (key.name === "backspace") {
                    if (cursor > 0) {
                        buf.splice(cursor - 1, 1);
                        cursor--;
                        const rest = buf.slice(cursor).join("");

                        stdout.moveCursor(-1, 0);
                        stdout.clearLine(1);
                        stdout.write(rest);
                        stdout.moveCursor(-rest.length, 0);
                    }
                } else if (char !== undefined) {
                    if (cursor === buf.length) {
                        stdout.write(char);
                        buf.push(char);
                        cursor++;
                    } else {
                        buf.splice(cursor, 0, char);
                        const rest = buf.slice(cursor + 1).join("");

                        stdout.write(char + rest);
                        cursor++;
                        stdout.moveCursor(-rest.length, 0);
                    }
                } else if (key.name === "left") {
                    if (cursor > 0) {
                        stdout.moveCursor(-1, 0);
                        cursor--;
                    }
                } else if (key.name === "right") {
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

export async function isNodeRepl() {
    const repl = await import("repl");
    // @ts-ignore fix CommonJS import
    return !!(repl.default ?? repl).repl;
}

export function listenForCancel() {
    const ctrl = new AbortController();
    const { signal } = ctrl;
    const promise = new Promise<null>(resolve => {
        const listener = (_: string | undefined, key: KeypressEventInfo) => {
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
