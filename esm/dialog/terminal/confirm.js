import { questionInDeno, questionInNode } from './index.js';
import { platform, which, run, escape } from './util.js';

function createAppleScript(message) {
    return "tell application (path to frontmost application as text)\n" +
        `  display dialog "${escape(message)}" with title "Confirm"`
        + ` buttons {"Cancel", "OK"} default button "OK"\n` +
        "end";
}
function createPowerShellScript(message) {
    return "Add-Type -AssemblyName PresentationFramework;"
        + `[System.Windows.MessageBox]::Show("${escape(message)}", "Confirm", "YesNo");`;
}
async function confirmInTerminal(message, options = {}) {
    if ((options === null || options === void 0 ? void 0 : options.preferGUI) && platform() === "darwin" && (await which("osascript"))) {
        const { code, stderr } = await run("osascript", [
            "-e",
            createAppleScript(message)
        ]);
        if (code) {
            if (stderr.includes("User canceled")) {
                return false;
            }
            else {
                throw new Error(stderr);
            }
        }
        else {
            return true;
        }
    }
    else if ((options === null || options === void 0 ? void 0 : options.preferGUI) && platform() === "linux" && (await which("zenity"))) {
        const { code, stderr } = await run("zenity", [
            "--question",
            "--title", "Confirm",
            "--text", message,
        ]);
        if (!code) {
            return true;
        }
        else if (code === 1) {
            return false;
        }
        else {
            throw new Error(stderr);
        }
    }
    else if ((options === null || options === void 0 ? void 0 : options.preferGUI) && platform() === "windows") {
        const { code, stdout, stderr } = await run("powershell", [
            "-Command",
            createPowerShellScript(message)
        ]);
        if (code) {
            throw new Error(stderr);
        }
        else {
            return stdout.trim() === "Yes" ? true : false;
        }
    }
    else {
        let answer;
        if (typeof Deno === "object") {
            answer = await questionInDeno(message + " [Y/n] ");
        }
        else {
            answer = await questionInNode(message + " [Y/n] ");
        }
        const ok = answer === null || answer === void 0 ? void 0 : answer.toLowerCase().trim();
        return ok === "" || ok === "y" || ok === "yes";
    }
}

export { confirmInTerminal as default };
//# sourceMappingURL=confirm.js.map
