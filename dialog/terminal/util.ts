import { basename, extname } from "../../path.ts";
import { getMIME } from "../../filetype.ts";

export function escape(str: string) {
    return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function createFileObject(content: Uint8Array, path: string, options: {
    lastModified?: number;
    relativePath?: string;
}): File {
    const { lastModified, relativePath } = options;
    const filename = basename(path);
    const type = getMIME(extname(filename)) ?? "";
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
        value: relativePath ?? "",
    });

    return file;
}

export async function readFile(path: string, relativePath = ""): Promise<File> {
    let content: Uint8Array;
    let lastModified: number;

    if (typeof Deno === "object") {
        const stats = await Deno.stat(path);
        content = await Deno.readFile(path);
        lastModified = stats.mtime ? stats.mtime.valueOf() : 0;
    } else {
        const { readFile, stat } = await import("fs/promises");
        const stats = await stat(path);
        content = await readFile(path);
        lastModified = stats.mtimeMs;
    }

    return createFileObject(content, path, { relativePath, lastModified });
}
