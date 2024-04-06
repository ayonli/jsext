import { lines } from '../../string.js';
import { run } from '../terminal/util.js';
import { UTIMap } from '../terminal/constants.js';

function htmlAcceptToFileFilter(accept) {
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
function createPowerShellScript(mode, title = "", options = {}) {
    const { type, save, defaultName } = options;
    if (mode === "file") {
        if (save) {
            return `Add-Type -AssemblyName System.Windows.Forms` +
                "\n" +
                "$saveFileDialog = [System.Windows.Forms.SaveFileDialog]::new()" +
                "\n" +
                "$saveFileDialog.Title = '" + title + "'" +
                "\n" +
                (defaultName ? "$saveFileDialog.FileName = '" + defaultName + "'\n" : "") +
                "$saveFileDialog.InitialDirectory = [System.IO.Directory]::GetCurrentDirectory()" +
                "\n" +
                "$saveFileDialog.ShowDialog() | Out-Null" +
                "\n" +
                "$saveFileDialog.FileName";
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
                "$openFileDialog.InitialDirectory = [System.IO.Directory]::GetCurrentDirectory()" +
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
            "$openFileDialog.InitialDirectory = [System.IO.Directory]::GetCurrentDirectory()" +
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
