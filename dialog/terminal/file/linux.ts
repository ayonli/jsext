import { lines } from "../../../string.ts";
import { run } from "../util.ts";
import { UTIMap } from "../constants.ts";
import { extname } from "../../../path.ts";

function htmlAcceptToFileFilter(accept: string): string {
    const list = Object.values(UTIMap);
    return accept.split(/\s*,\s*/).map(type => {
        const _type = type.toLowerCase();

        for (const types of list) {
            if (types.includes(_type)) {
                return types.filter(t => t.startsWith(".")).map(t => `*${t}`).join(" ");
            }
        }

        return type;
    }).join(" ");
}

export async function linuxPickFile(title = "", options: {
    type?: string | undefined;
    forSave?: boolean | undefined;
    defaultName?: string | undefined;
} = {}): Promise<string | null> {
    const { type, forSave, defaultName } = options;
    const args = [
        "--file-selection",
    ];

    if (title) {
        args.push("--title", title);
    }

    if (type) {
        args.push("--file-filter", htmlAcceptToFileFilter(type));
    }

    if (forSave) {
        args.push("--save", "--confirm-overwrite");

        if (defaultName) {
            args.push("--filename", defaultName);

            if (!type) {
                const ext = extname(defaultName);
                ext && args.push("--file-filter", htmlAcceptToFileFilter(ext));
            }
        }
    }

    const { code, stdout, stderr } = await run("zenity", args);

    if (!code) {
        const path = stdout.trim();
        return path || null;
    } else if (code === 1) {
        return null;
    } else {
        throw new Error(stderr.trim());
    }
}

export async function linuxPickFiles(title = "", type = ""): Promise<string[]> {
    const args = [
        "--file-selection",
        "--multiple",
        "--separator", "\n",
    ];

    if (title) {
        args.push("--title", title);
    }

    if (type) {
        args.push("--file-filter", htmlAcceptToFileFilter(type));
    }

    const { code, stdout, stderr } = await run("zenity", args);

    if (!code) {
        const output = stdout.trim();
        return output ? lines(stdout.trim()) : [];
    } else if (code === 1) {
        return [];
    } else {
        throw new Error(stderr.trim());
    }
}

export async function linuxPickFolder(title = ""): Promise<string | null> {
    const args = [
        "--file-selection",
        "--directory",
    ];

    if (title) {
        args.push("--title", title);
    }

    const { code, stdout, stderr } = await run("zenity", args);

    if (!code) {
        const dir = stdout.trim();
        return dir || null;
    } else if (code === 1) {
        return null;
    } else {
        throw new Error(stderr.trim());
    }
}
