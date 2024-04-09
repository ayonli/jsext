import { hijackNodeStdin } from "./util.ts";
import question from "./question.ts";

export async function questionInDeno(message: string, options: {
    defaultValue?: string | undefined;
    mask?: string | undefined;
} = {}): Promise<string | null> {
    const { stdin, stdout } = Deno;

    if (!stdin.isTerminal()) {
        return null;
    }

    try {
        stdin.setRaw(true);
        return await question(message, { stdin, stdout, ...options });
    } finally {
        stdin.setRaw(false);
    }
}

export async function questionInNode(message: string, options: {
    defaultValue?: string | undefined;
    mask?: string | undefined;
} = {}) {
    const { stdin, stdout } = process;

    if (!stdout.isTTY) {
        return null;
    }

    return await hijackNodeStdin(stdin, async () => {
        try {
            stdin.setRawMode(true);
            return await question(message, { stdin, stdout, ...options });
        } finally {
            stdin.setRawMode(false);
        }
    });
}
