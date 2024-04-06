import { lines } from "../../string.ts";
import { basename, join } from "../../path.ts";
import readAll from "../../readAll.ts";
import { readFile } from "./util.ts";
import { run } from "../terminal/util.ts";
import { UTIMap } from "./constants.ts";

function htmlAcceptToAppleType(accept: string): string {
    const entries = Object.entries(UTIMap);
    return accept.split(/\s*,\s*/).map(type => {
        const _type = type.toLowerCase();

        for (const [uti, types] of entries) {
            if (types.includes(_type)) {
                return uti;
            }
        }

        return type;
    }).join(",");
}

function createAppleScript(mode: "file" | "files" | "folder", title = "", type = ""): string {
    if (mode === "file") {
        const _type = type ? htmlAcceptToAppleType(type) : "";
        return "tell application (path to frontmost application as text)\n" +
            "  set myFile to choose file" + (title ? ` with prompt "${title}"` : "") +
            (_type ? ` of type {${_type.split(/\s*,\s*/).map(s => `"${s}"`)}}` : "") +
            " invisibles false" +
            "\n  POSIX path of myFile\n" +
            "end";
    } else if (mode === "files") {
        const _type = type ? htmlAcceptToAppleType(type) : "";
        return "tell application (path to frontmost application as text)\n" +
            "  set myFiles to choose file" + (title ? ` with prompt "${title}"` : "") +
            (_type ? ` of type {${_type.split(/\s*,\s*/).map(s => `"${s}"`)}}` : "") +
            " invisibles false" +
            " multiple selections allowed true" +
            "\n" +
            "  set theList to {}\n" +
            "  repeat with aItem in myFiles\n" +
            "    set end of theList to POSIX path of aItem\n" +
            "  end repeat\n" +
            `  set my text item delimiters to "\\n"\n` +
            `  return theList as text\n` +
            "end";
    } else {
        return "tell application (path to frontmost application as text)\n" +
            "  set myFolder to choose folder" + (title ? ` with prompt "${title}"` : "") +
            " invisibles false" +
            "\n  POSIX path of myFolder\n" +
            "end";
    }
}

export async function macChooseOneFile(title = "", type = ""): Promise<File | null> {
    const { code, stdout, stderr } = await run("osascript", [
        "-e",
        createAppleScript("file", title, type)
    ]);

    if (!code) {
        const path = stdout.trim();
        return await readFile(path);
    } else {
        if (stderr.includes("User canceled")) {
            return null;
        } else {
            throw new Error(stderr.trim());
        }
    }
}

export async function macChooseMultipleFiles(title = "", type = ""): Promise<File[]> {
    const { code, stdout, stderr } = await run("osascript", [
        "-e",
        createAppleScript("files", title, type)
    ]);

    if (!code) {
        const paths = lines(stdout.trim());
        return await Promise.all(paths.map(path => readFile(path)));
    } else {
        if (stderr.includes("User canceled")) {
            return [];
        } else {
            throw new Error(stderr.trim());
        }
    }
}

export async function macChooseFolder(title = ""): Promise<File[]> {
    const { code, stdout, stderr } = await run("osascript", [
        "-e",
        createAppleScript("folder", title)
    ]);

    if (!code) {
        const dir = stdout.trim();
        const folder = basename(dir);
        const paths: string[] = (await readAll(Deno.readDir(dir)))
            .filter(item => item.isFile)
            .map(item => join(dir, item.name));

        return await Promise.all(paths.map(path => readFile(path, folder)));
    } else {
        if (stderr.includes("User canceled")) {
            return [];
        } else {
            throw new Error(stderr.trim());
        }
    }
}
