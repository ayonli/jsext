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
                return types.filter(t => t.startsWith(".")).map(t => `*${t}|*${t}`).join("|");
            }
        }

        return type;
    }).join("|");
}

function createPowerShellScript(mode: "file" | "files" | "folder", title = "", options: {
    type?: string | undefined;
    forSave?: boolean | undefined;
    defaultName?: string | undefined;
} = {}): string {
    const { type, forSave, defaultName } = options;

    if (mode === "file") {
        if (forSave) {
            let filter = type ? htmlAcceptToFileFilter(type) : "";

            if (!filter && defaultName) {
                const ext = extname(defaultName);
                ext && (filter = htmlAcceptToFileFilter(ext));
            }

            return `Add-Type -AssemblyName System.Windows.Forms` +
                "\n" +
                "$saveFileDialog = [System.Windows.Forms.SaveFileDialog]::new()" +
                "\n" +
                "$saveFileDialog.Title = '" + title + "'" +
                "\n" +
                (defaultName ? "$saveFileDialog.FileName = '" + defaultName + "'\n" : "") +
                (filter ? "$saveFileDialog.Filter = '" + filter + "'\n" : "") +
                "if ($saveFileDialog.ShowDialog() -eq 'OK') {\n" +
                "  $saveFileDialog.FileName\n" +
                "}\n";
        } else {
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
                "$openFileDialog.ShowDialog() | Out-Null" +
                "\n" +
                "$openFileDialog.FileName";
        }
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

export async function windowsPickFile(title = "", options: {
    type?: string | undefined;
    forSave?: boolean | undefined;
    defaultName?: string | undefined;
} = {}): Promise<string | null> {
    const { code, stdout, stderr } = await run("powershell", [
        "-c",
        createPowerShellScript("file", title, options)
    ]);

    if (!code) {
        const path = stdout.trim();
        return path || null;
    } else {
        throw new Error(stderr);
    }
}

export async function windowsPickFiles(title = "", type = ""): Promise<string[]> {
    const { code, stdout, stderr } = await run("powershell", [
        "-c",
        createPowerShellScript("files", title, { type })
    ]);

    if (!code) {
        const output = stdout.trim();
        return output ? lines(stdout.trim()) : [];
    } else {
        throw new Error(stderr);
    }
}

export async function windowsPickFolder(title = ""): Promise<string | null> {
    const { code, stdout, stderr } = await run("powershell", [
        "-c",
        createPowerShellScript("folder", title)
    ]);

    if (!code) {
        const dir = stdout.trim();
        return dir || null;
    } else {
        throw new Error(stderr);
    }
}
