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

        stdout.write(message);

        if (defaultValue) {
            stdout.write(defaultValue);
            buf.push(...defaultValue);
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
                    if (buf.length) {
                        stdout.moveCursor(-1, 0);
                        stdout.clearLine(1);
                        buf.pop();
                    }
                } else if (char !== undefined) {
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

export async function isNodeRepl() {
    const repl = await import("repl");
    // @ts-ignore fix CommonJS import
    return !!(repl.default ?? repl).repl;
}

export function handleCancel(): Promise<null> {
    return new Promise<null>(resolve => {
        process.stdin.on("keypress", (_, key: KeypressEventInfo) => {
            if (key.name === "escape" || (key.name === "c" && key.ctrl)) {
                process.stdout.write("\n");
                resolve(null);
            }
        });
    });
}
