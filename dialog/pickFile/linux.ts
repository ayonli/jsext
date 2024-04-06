import { lines } from "../../string.ts";
import { run } from "../terminal/util.ts";
import { UTIMap } from "../terminal/constants.ts";

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
    save?: boolean | undefined;
    defaultName?: string | undefined;
} = {}): Promise<string | null> {
    const { type, save, defaultName } = options;
    const args = [
        "--file-selection",
        "--title", title,
    ];

    if (type) {
        args.push("--file-filter", htmlAcceptToFileFilter(type));
    }

    if (save) {
        args.push("--save");
        if (defaultName) {
            args.push("--filename", defaultName);
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
        "--title", title,
        "--multiple",
        "--separator", "\n",
    ];

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
    const { code, stdout, stderr } = await run("zenity", [
        "--file-selection",
        "--title", title,
        "--directory",
    ]);

    if (!code) {
        const dir = stdout.trim();
        return dir || null;
    } else if (code === 1) {
        return null;
    } else {
        throw new Error(stderr.trim());
    }
}
