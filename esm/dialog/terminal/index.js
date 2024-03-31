import { isNodeRepl, hijackNodeStdin } from './util.js';
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
    if (stdin.isPaused()) {
        stdin.resume();
    }
    const rawMode = stdin.isRaw;
    rawMode || stdin.setRawMode(true);
    try {
        return await question(message, { stdin, stdout, ...options });
    }
    finally {
        stdin.setRawMode(rawMode);
        if (!(await isNodeRepl())) {
            stdin.pause();
        }
    }
}
async function questionInNodeRepl(message, options = {}) {
    return await hijackNodeStdin(process.stdin, async () => {
        return await questionInNode(message, options);
    });
}

export { questionInDeno, questionInNode, questionInNodeRepl };
//# sourceMappingURL=index.js.map
