import { escape } from './util.js';
import { platform } from '../../runtime.js';
import { run, isWSL, powershell, lockStdin } from '../../cli.js';
import question from './question.js';

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
    if ((options === null || options === void 0 ? void 0 : options.gui) && platform() === "darwin") {
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
    else if ((options === null || options === void 0 ? void 0 : options.gui) && (platform() === "windows" || isWSL())) {
        const { code, stdout, stderr } = await powershell(createPowerShellScript(message));
        if (code) {
            throw new Error(stderr);
        }
        else {
            return stdout.trim() === "Yes" ? true : false;
        }
    }
    else if ((options === null || options === void 0 ? void 0 : options.gui) && platform() === "linux") {
        const args = [
            "--question",
            "--title", "Confirm",
            "--width", "365",
        ];
        if (message) {
            args.push("--text", message);
        }
        const { code, stderr } = await run("zenity", args);
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
    else {
        const answer = await lockStdin(() => question(message + " [Y/n] "));
        const ok = answer === null || answer === void 0 ? void 0 : answer.toLowerCase().trim();
        return ok === "" || ok === "y" || ok === "yes";
    }
}

export { confirmInTerminal as default };
//# sourceMappingURL=confirm.js.map
