import { questionInDeno, questionInNode } from './index.js';
import { platform, which, run, escape } from './util.js';

function createAppleScript(message) {
    return "tell application (path to frontmost application as text)\n" +
        `  display dialog "${escape(message)}" buttons {"OK"} default button "OK"\n` +
        "end";
}
function createPowerShellScript(message) {
    return "Add-Type -AssemblyName PresentationFramework;"
        + `[System.Windows.MessageBox]::Show("${escape(message)}");`;
}
async function alertInTerminal(message, options = {}) {
    if ((options === null || options === void 0 ? void 0 : options.preferGUI) && platform() === "darwin" && (await which("osascript"))) {
        const { code, stderr } = await run("osascript", [
            "-e",
            createAppleScript(message)
        ]);
        if (code) {
            throw new Error(stderr);
        }
    }
    else if ((options === null || options === void 0 ? void 0 : options.preferGUI) && platform() === "linux" && (await which("zenity"))) {
        const { code, stderr } = await run("zenity", [
            "--info",
            "--text", message,
        ]);
        if (code && code !== 1) {
            throw new Error(stderr);
        }
    }
    else if ((options === null || options === void 0 ? void 0 : options.preferGUI) && platform() === "windows") {
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
