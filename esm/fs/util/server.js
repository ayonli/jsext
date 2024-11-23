import { isDeno, isNodeLike } from '../../env.js';

async function resolveHomeDir(path) {
    if (path[0] === "~" && (isDeno || isNodeLike)) {
        const os = await import('node:os');
        const homedir = os.homedir();
        path = homedir + path.slice(1);
    }
    return path;
}

export { resolveHomeDir };
//# sourceMappingURL=server.js.map
