import { lines } from "../../string.ts";
import { join } from "../../path.ts";
import readAll from "../../readAll.ts";
import { readFile, run } from "./util.ts";
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
    const { code, stdout, stderr } = await run("zenity", [
        "--file-selection",
        "--title", title,
        "--file-filter", htmlAcceptToFileFilter(type),
    ]);

    if (!code) {
        const path = stdout.trim();

        if (path) {
            return await readFile(path);
        } else {
            return null;
        }
    } else {
        throw new Error(stderr.trim());
    }
}

export async function linuxChooseMultipleFiles(title = "", type = ""): Promise<File[]> {
    const { code, stdout, stderr } = await run("zenity", [
        "--file-selection",
        "--title", title,
        "--file-filter", htmlAcceptToFileFilter(type),
        "--multiple",
        "--separator", "\n",
    ]);

    if (!code) {
        const paths = lines(stdout.trim());
        return await Promise.all(paths.map(path => readFile(path)));
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
        const folder = dir.split("/").pop();
        const paths: string[] = (await readAll(Deno.readDir(dir)))
            .filter(item => item.isFile)
            .map(item => join(dir, item.name));

        return await Promise.all(paths.map(path => readFile(path, folder)));
    } else {
        throw new Error(stderr.trim());
    }
}
