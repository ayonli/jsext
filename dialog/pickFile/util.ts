import { isNode } from "../../parallel/constants.ts";
import { concat, text } from "../../bytes.ts";
import { basename, extname, join } from "../../path.ts";
import readAll from "../../readAll.ts";
import { UTIMap } from "./constants.ts";

export type WellKnownPlatforms = "android" | "darwin" | "freebsd" | "linux" | "netbsd" | "solaris" | "windows";
export const WellKnownPlatforms: WellKnownPlatforms[] = [
    "android",
    "darwin",
    "freebsd",
    "linux",
    "netbsd",
    "solaris",
    "windows",
];

export function platform(): WellKnownPlatforms | "others" {
    if (typeof Deno === "object") {
        if (WellKnownPlatforms.includes(Deno.build.os as any)) {
            return Deno.build.os as WellKnownPlatforms;
        } else {
            return "others";
        }
    } else if (process.platform === "win32") {
        return "windows";
    } else if (process.platform === "sunos") {
        return "solaris";
    } else if (WellKnownPlatforms.includes(process.platform as any)) {
        return process.platform as WellKnownPlatforms;
    } else {
        return "others";
    }
}

export async function run(cmd: string, args: string[]): Promise<{
    code: number;
    stdout: string;
    stderr: string;
}> {
    if (typeof Deno === "object") {
        const _cmd = new Deno.Command(cmd, { args });
        const { code, stdout, stderr } = await _cmd.output();
        return {
            code,
            stdout: text(stdout),
            stderr: text(stderr),
        };
    } else if (isNode) {
        const { spawn } = await import("child_process");
        const child = spawn(cmd, args);
        const stdout: string[] = [];
        const stderr: string[] = [];

        child.stdout.on("data", chunk => stdout.push(String(chunk)));
        child.stderr.on("data", chunk => stderr.push(String(chunk)));

        const code = await new Promise<number>((resolve) => {
            child.on("exit", (code, signal) => {
                if (code === null && signal) {
                    resolve(1);
                } else {
                    resolve(code ?? 0);
                }
            });
        });

        return {
            code,
            stdout: stdout.join(""),
            stderr: stderr.join(""),
        };
    } else {
        throw new Error("Unsupported runtime");
    }
}

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
