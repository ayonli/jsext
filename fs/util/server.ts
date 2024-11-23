import { isDeno, isNodeLike } from "../../env.ts";

export async function resolveHomeDir(path: string): Promise<string> {
    if (path[0] === "~" && (isDeno || isNodeLike)) {
        const os = await import("node:os");
        const homedir = os.homedir();
        path = homedir + path.slice(1);
    }

    return path;
}
