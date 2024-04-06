import { concat } from "../../bytes.ts";
import { basename, extname, join } from "../../path.ts";
import readAll from "../../readAll.ts";
import { UTIMap } from "./constants.ts";

export function createFile(content: Uint8Array, path: string, options: {
    lastModified?: number;
    folder?: string;
}): File {
    const { lastModified, folder } = options;
    const tagsList = Object.values(UTIMap);
    const filename = basename(path);
    const ext = extname(filename).toLowerCase();
    const type = tagsList.find(tags => tags.includes(ext))
        ?.find(tag => tag.includes("/")) ?? "";
    let file: File;

    if (lastModified) {
        file = new File([content], filename, { type, lastModified });
    } else {
        file = new File([content], path, { type });
    }

    Object.defineProperty(file, "webkitRelativePath", {
        configurable: true,
        enumerable: true,
        writable: false,
        value: folder ? join(folder, file.name) : "",
    });

    return file;
}

export async function readFile(path: string, folder = "") {
    let content: Uint8Array;
    let lastModified: number;

    if (typeof Deno === "object") {
        const fsFile = await Deno.open(path);
        const stats = await fsFile.stat();
        content = concat(...(await readAll(fsFile.readable)));
        lastModified = stats.mtime ? stats.mtime.valueOf() : 0;
    } else {
        const { readFile, stat } = await import("fs/promises");
        const stats = await stat(path);
        content = await readFile(path);
        lastModified = stats.mtimeMs;
    }

    return createFile(content, path, { folder, lastModified });
}
