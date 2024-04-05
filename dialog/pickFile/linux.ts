import { lines } from "../../string.ts";
import { basename, join } from "../../path.ts";
import readAll from "../../readAll.ts";
import { readFile } from "./util.ts";
import { run } from "../terminal/util.ts";
import { UTIMap } from "./constants.ts";

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

export async function linuxChooseOneFile(title = "", type = ""): Promise<File | null> {
    const args = [
        "--file-selection",
        "--title", title,
    ];

    if (type) {
        args.push("--file-filter", htmlAcceptToFileFilter(type));
    }

    const { code, stdout, stderr } = await run("zenity", args);

    if (!code) {
        const path = stdout.trim();

        if (path) {
            return await readFile(path);
        } else {
            return null;
        }
    } else if (code === 1) {
        return null;
    } else {
        throw new Error(stderr.trim());
    }
}

export async function linuxChooseMultipleFiles(title = "", type = ""): Promise<File[]> {
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

        if (output) {
            const paths = lines(stdout.trim());
            return await Promise.all(paths.map(path => readFile(path)));
        } else {
            return [];
        }
    } else if (code === 1) {
        return [];
    } else {
        throw new Error(stderr.trim());
    }
}

export async function linuxChooseFolder(title = ""): Promise<File[]> {
    const { code, stdout, stderr } = await run("zenity", [
        "--file-selection",
        "--title", title,
        "--directory",
    ]);

    if (!code) {
        const dir = stdout.trim();

        if (!dir) {
            return [];
        }

        const folder = basename(dir);
        let filenames: string[] = [];

        if (typeof Deno === "object") {
            filenames = (await readAll(Deno.readDir(dir)))
                .filter(item => item.isFile)
                .map(item => item.name);
        } else {
            const { readdir } = await import("fs/promises");
            filenames = (await readdir(dir, { withFileTypes: true }))
                .filter(item => item.isFile())
                .map(item => item.name);
        }

        const paths = filenames.map(name => join(dir, name));

        return await Promise.all(paths.map(path => readFile(path, folder)));
    } else if (code === 1) {
        return [];
    } else {
        throw new Error(stderr.trim());
    }
}
