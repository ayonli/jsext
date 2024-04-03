import { hijackNodeStdin } from './util.js';
import question from './question.js';

async function questionInDeno(message, options = {}) {
    const { stdin, stdout } = Deno;
    if (!stdin.isTerminal()) {
        return null;
    }
    stdin.setRaw(true);
    try {
        return await question(message, { stdin, stdout, ...options });
    }
    finally {
        stdin.setRaw(false);
    }
}
async function questionInNode(message, options = {}) {
    const { stdin, stdout } = process;
    if (!stdout.isTTY) {
        return null;
    }
    return await hijackNodeStdin(stdin, async () => {
        const rawMode = stdin.isRaw;
        rawMode || stdin.setRawMode(true);
        try {
            return await question(message, { stdin, stdout, ...options });
        }
        finally {
            stdin.setRawMode(rawMode);
        }
    });
}

export { questionInDeno, questionInNode };
//# sourceMappingURL=index.js.map
