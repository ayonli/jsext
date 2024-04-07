import { questionInDeno, questionInNode } from './index.js';
import { platform, run, escape } from './util.js';

function createAppleScript(message) {
    return "tell application (path to frontmost application as text)\n" +
        `  display dialog "${escape(message)}" with title "Alert" buttons {"OK"} default button "OK"\n` +
        "end";
}
function createPowerShellScript(message) {
    return "Add-Type -AssemblyName PresentationFramework;"
        + `[System.Windows.MessageBox]::Show("${escape(message)}", "Alert");`;
}
async function alertInTerminal(message, options = {}) {
    if ((options === null || options === void 0 ? void 0 : options.gui) && platform() === "darwin") {
        const { code, stderr } = await run("osascript", [
            "-e",
            createAppleScript(message)
        ]);
        if (code) {
            throw new Error(stderr);
        }
    }
    else if ((options === null || options === void 0 ? void 0 : options.gui) && platform() === "linux") {
        const { code, stderr } = await run("zenity", [
            "--info",
            "--title", "Alert",
            "--width", "365",
            "--text", message,
        ]);
        if (code && code !== 1) {
            throw new Error(stderr);
        }
    }
    else if ((options === null || options === void 0 ? void 0 : options.gui) && platform() === "windows") {
        const { code, stderr } = await run("powershell", [
            "-Command",
            createPowerShellScript(message)
        ]);
        if (code) {
            throw new Error(stderr);
        }
    }
    else if (typeof Deno === "object") {
        await questionInDeno(message + " [Enter] ");
    }
    else {
        await questionInNode(message + " [Enter] ");
    }
}

export { alertInTerminal as default };
//# sourceMappingURL=alert.js.map
