import { extname } from '../../../path.js';
import { lines } from '../../../string.js';
import { run } from '../../../cli.js';
import { getExtensions } from '../../../filetype.js';

function htmlAcceptToFileFilter(accept) {
    const groups = [];
    for (const type of accept.split(/\s*,\s*/)) {
        if (type.endsWith("/*")) {
            groups.push(type);
        }
        else {
            const group = groups[groups.length - 1];
            if (!group || typeof group === "string") {
                groups.push([type]);
            }
            else {
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
        }
        else if (group === "*/*") {
            return "All|*";
        }
        else {
            const patterns = getExtensions(group).map(t => `*${t}`).join(";");
            if (!patterns) {
                return undefined;
            }
            else if (group === "video/*") {
                return "Videos|" + patterns;
            }
            else if (group === "audio/*") {
                return "Audios|" + patterns;
            }
            else if (group === "image/*") {
                return "Images|" + patterns;
            }
            else if (group === "text/*") {
                return "Texts|" + patterns;
            }
            else {
                return patterns;
            }
        }
    }).filter(Boolean).join("|");
}
function createPowerShellScript(mode, title = "", options = {}) {
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
        }
        else {
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
    }
    else if (mode === "files") {
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
    }
    else {
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
async function windowsPickFile(title = "", options = {}) {
    const { code, stdout, stderr } = await run("powershell", [
        "-c",
        createPowerShellScript("file", title, options)
    ]);
    if (!code) {
        const path = stdout.trim();
        return path || null;
    }
    else {
        throw new Error(stderr);
    }
}
async function windowsPickFiles(title = "", type = "") {
    const { code, stdout, stderr } = await run("powershell", [
        "-c",
        createPowerShellScript("files", title, { type })
    ]);
    if (!code) {
        const output = stdout.trim();
        return output ? lines(stdout.trim()) : [];
    }
    else {
        throw new Error(stderr);
    }
}
async function windowsPickFolder(title = "") {
    const { code, stdout, stderr } = await run("powershell", [
        "-c",
        createPowerShellScript("folder", title)
    ]);
    if (!code) {
        const dir = stdout.trim();
        return dir || null;
    }
    else {
        throw new Error(stderr);
    }
}

export { windowsPickFile, windowsPickFiles, windowsPickFolder };
//# sourceMappingURL=windows.js.map
