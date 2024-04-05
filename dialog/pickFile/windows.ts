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
                return types.filter(t => t.startsWith(".")).map(t => `*${t}|*${t}`).join("|");
            }
        }

        return type;
    }).join("|");
}

function createPowerShellScript(mode: "file" | "files" | "folder", title = "", type = ""): string {
    if (mode === "file") {
        const filter = type ? htmlAcceptToFileFilter(type) : "";
        return `Add-Type -AssemblyName System.Windows.Forms` +
            "\n" +
            "$openFileDialog = [System.Windows.Forms.OpenFileDialog]::new()" +
            "\n" +
            "$openFileDialog.Title = '" + title + "'" +
            "\n" +
            (filter ? "$openFileDialog.Filter = '" + filter + "'\n" : "") +
            "$openFileDialog.Multiselect = $false" +
            "\n" +
            "$openFileDialog.InitialDirectory = [System.IO.Directory]::GetCurrentDirectory()" +
            "\n" +
            "$openFileDialog.ShowDialog() | Out-Null" +
            "\n" +
            "$openFileDialog.FileName";
    } else if (mode === "files") {
        const filter = type ? htmlAcceptToFileFilter(type) : "";
        return `Add-Type -AssemblyName System.Windows.Forms` +
            "\n" +
            "$openFileDialog = [System.Windows.Forms.OpenFileDialog]::new()" +
            "\n" +
            "$openFileDialog.Title = '" + title + "'" +
            "\n" +
            (filter ? "$openFileDialog.Filter = '" + filter + "'\n" : "") +
            "$openFileDialog.Multiselect = $true" +
            "\n" +
            "$openFileDialog.InitialDirectory = [System.IO.Directory]::GetCurrentDirectory()" +
            "\n" +
            "$openFileDialog.ShowDialog() | Out-Null" +
            "\n" +
            "$openFileDialog.FileNames -join \"`n\"";
    } else {
        return `Add-Type -AssemblyName System.Windows.Forms` +
            "\n" +
            "$folderBrowserDialog = [System.Windows.Forms.FolderBrowserDialog]::new()" +
            "\n" +
            "$folderBrowserDialog.Description = '" + title + "'" +
            "\n" +
            "$folderBrowserDialog.ShowDialog() | Out-Null" +
            "\n" +
            "$folderBrowserDialog.SelectedPath";
    }
}

export async function windowsChooseOneFile(title = "", type = ""): Promise<File | null> {
    const { code, stdout, stderr } = await run("powershell", [
        "-c",
        createPowerShellScript("file", title, type)
    ]);

    if (!code) {
        const path = stdout.trim();

        if (path) {
            return await readFile(path);
        } else {
            return null;
        }
    } else {
        throw new Error(stderr);
    }
}

export async function windowsChooseMultipleFiles(title = "", type = ""): Promise<File[]> {
    const { code, stdout, stderr } = await run("powershell", [
        "-c",
        createPowerShellScript("files", title, type)
    ]);

    if (!code) {
        const output = stdout.trim();

        if (output) {
            const paths = lines(stdout.trim());
            return await Promise.all(paths.map(path => readFile(path)));
        } else {
            return [];
        }
    } else {
        throw new Error(stderr);
    }
}

export async function windowsChooseFolder(title = ""): Promise<File[]> {
    const { code, stdout, stderr } = await run("powershell", [
        "-c",
        createPowerShellScript("folder", title)
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
    } else {
        throw new Error(stderr);
    }
}
