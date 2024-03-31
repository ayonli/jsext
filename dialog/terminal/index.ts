import { hijackNodeStdin, isNodeRepl } from "./util.ts";
import question from "./question.ts";

export async function questionInDeno(
    message: string,
    defaultValue = ""
): Promise<string | null> {
    const { stdin, stdout } = Deno;

    if (!stdin.isTerminal()) {
        return null;
    }

    stdin.setRaw(true);

    try {
        return await question(stdin, stdout, message, defaultValue);
    } finally {
        stdin.setRaw(false);
    }
}

export async function questionInNode(
    message: string,
    defaultValue = ""
) {
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
    } finally {
        stdin.setRawMode(rawMode);

        if (!(await isNodeRepl())) {
            stdin.pause();
        }
    }
}

export async function questionInNodeRepl(
    message: string,
    defaultValue = ""
): Promise<string | null> {
    return await hijackNodeStdin(process.stdin, async () => {
        return await questionInNode(message, defaultValue);
    });
}
