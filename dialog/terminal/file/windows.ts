import { extname } from "../../../path.ts";
import { lines } from "../../../string.ts";
import { isWSL, powershell } from "../../../cli.ts";
import { getExtensions } from "../../../filetype.ts";

function htmlAcceptToFileFilter(accept: string): string {
    const groups: (string | string[])[] = [];

    for (const type of accept.split(/\s*,\s*/)) {
        if (type.endsWith("/*")) {
            groups.push(type);
        } else {
            const group = groups[groups.length - 1];

            if (!group || typeof group === "string") {
                groups.push([type]);
            } else {
                group.push(type);
            }
        }
    }

    return groups.map(group => {
        if (Array.isArray(group)) {
            const patterns = group.map(type => getExtensions(type).map(t => `*${t}`))
                .flat()
                .join(";");
            return patterns + "|" + patterns;
        } else if (group === "*/*") {
            return "All Files|*";
        } else {
            const patterns = getExtensions(group).map(t => `*${t}`).join(";");

            if (!patterns) {
                return undefined;
            } else if (group === "video/*") {
                return "Video Files|" + patterns;
            } else if (group === "audio/*") {
                return "Audio Files|" + patterns;
            } else if (group === "image/*") {
                return "Image Files|" + patterns;
            } else if (group === "text/*") {
                return "Text Files|" + patterns;
            } else {
                return patterns;
            }
        }
    }).filter(Boolean).join("|");
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

function refinePath(path: string) {
    if (isWSL()) {
        return "/mnt/"
            + path.replace(/\\/g, "/").replace(/^([a-z]):/i, (_, $1: string) => $1.toLowerCase());
    }

    return path;
}

export async function windowsPickFile(title = "", options: {
    type?: string | undefined;
    forSave?: boolean | undefined;
    defaultName?: string | undefined;
} = {}): Promise<string | null> {
    const { code, stdout, stderr } = await powershell(
        createPowerShellScript("file", title, options)
    );

    if (!code) {
        const path = stdout.trim();
        return path ? refinePath(path) : null;
    } else {
        throw new Error(stderr);
    }
}

export async function windowsPickFiles(title = "", type = ""): Promise<string[]> {
    const { code, stdout, stderr } = await powershell(
        createPowerShellScript("files", title, { type })
    );

    if (!code) {
        const output = stdout.trim();
        return output ? lines(stdout.trim()).map(refinePath) : [];
    } else {
        throw new Error(stderr);
    }
}

export async function windowsPickFolder(title = ""): Promise<string | null> {
    const { code, stdout, stderr } = await powershell(
        createPowerShellScript("folder", title)
    );

    if (!code) {
        const dir = stdout.trim();
        return dir ? refinePath(dir) : null;
    } else {
        throw new Error(stderr);
    }
}
