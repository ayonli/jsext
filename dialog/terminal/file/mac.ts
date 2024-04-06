import { lines } from "../../../string.ts";
import { run } from "../util.ts";
import { UTIMap } from "../constants.ts";

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

function createAppleScript(mode: "file" | "files" | "folder", title = "", options: {
    type?: string | undefined;
    save?: boolean | undefined;
    defaultName?: string | undefined;
} = {}): string {
    const { type, save, defaultName } = options;

    if (mode === "file") {
        if (save) {
            return "tell application (path to frontmost application as text)\n" +
                "  set myFile to choose file name" + (title ? ` with prompt "${title}"` : "") +
                (defaultName ? ` default name "${defaultName}"` : "") +
                "\n  POSIX path of myFile\n" +
                "end";
        } else {
            const _type = type ? htmlAcceptToAppleType(type) : "";
            return "tell application (path to frontmost application as text)\n" +
                "  set myFile to choose file" + (title ? ` with prompt "${title}"` : "") +
                (_type ? ` of type {${_type.split(/\s*,\s*/).map(s => `"${s}"`)}}` : "") +
                " invisibles false" +
                "\n  POSIX path of myFile\n" +
                "end";
        }
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

export async function macPickFile(title = "", options: {
    type?: string | undefined;
    save?: boolean | undefined;
    defaultName?: string | undefined;
} = {}): Promise<string | null> {
    const { code, stdout, stderr } = await run("osascript", [
        "-e",
        createAppleScript("file", title, options)
    ]);

    if (!code) {
        const path = stdout.trim();
        return path || null;
    } else {
        if (stderr.includes("User canceled")) {
            return null;
        } else {
            throw new Error(stderr.trim());
        }
    }
}

export async function macPickFiles(title = "", type = ""): Promise<string[]> {
    const { code, stdout, stderr } = await run("osascript", [
        "-e",
        createAppleScript("files", title, { type })
    ]);

    if (!code) {
        const output = stdout.trim();
        return output ? lines(stdout.trim()) : [];
    } else {
        if (stderr.includes("User canceled")) {
            return [];
        } else {
            throw new Error(stderr.trim());
        }
    }
}

export async function macPickFolder(title = ""): Promise<string | null> {
    const { code, stdout, stderr } = await run("osascript", [
        "-e",
        createAppleScript("folder", title)
    ]);

    if (!code) {
        const dir = stdout.trim();
        return dir || null;
    } else {
        if (stderr.includes("User canceled")) {
            return null;
        } else {
            throw new Error(stderr.trim());
        }
    }
}
