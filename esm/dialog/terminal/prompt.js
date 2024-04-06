import { questionInDeno, questionInNode } from './index.js';
import { platform, which, run, escape } from './util.js';

function createAppleScript(message, defaultValue = "", password = false) {
    return "tell application (path to frontmost application as text)\n" +
        `  set response to display dialog "${escape(message)}" default answer "${escape(defaultValue)}" `
        + `${password ? "hidden answer true" : ""}\n` +
        "  return text returned of response\n" +
        "end";
}
function createPowerShellScript(message, defaultValue = "", password = false) {
    return "Add-Type -AssemblyName Microsoft.VisualBasic;"
        + `[Microsoft.VisualBasic.Interaction]::InputBox("${escape(message)}", "Prompt", "${escape(defaultValue)}");`;
}
async function promptInTerminal(message, options = {}) {
    var _a;
    if ((options === null || options === void 0 ? void 0 : options.preferGUI) && platform() === "darwin" && (await which("osascript"))) {
        const { code, stdout, stderr } = await run("osascript", [
            "-e",
            createAppleScript(message, options.defaultValue, options.type === "password")
        ]);
        if (code) {
            if (stderr.includes("User canceled")) {
                return null;
            }
            else {
                throw new Error(stderr);
            }
        }
        else {
            return stdout.trim();
        }
    }
    else if ((options === null || options === void 0 ? void 0 : options.preferGUI) && platform() === "linux" && (await which("zenity"))) {
        const args = [
            "--entry",
            "--text", message,
            "--entry-text",
            (_a = options.defaultValue) !== null && _a !== void 0 ? _a : ""
        ];
        if (options.type === "password") {
            args.push("--hide-text");
        }
        const { code, stdout, stderr } = await run("zenity", args);
        if (!code) {
            return stdout.trim();
        }
        else if (code === 1) {
            return null;
        }
        else {
            throw new Error(stderr);
        }
    }
    else if ((options === null || options === void 0 ? void 0 : options.preferGUI) && platform() === "windows") {
        const { code, stdout, stderr } = await run("powershell", [
            "-Command",
            createPowerShellScript(message, options.defaultValue, options.type === "password")
        ]);
        if (code) {
            throw new Error(stderr);
        }
        else {
            return stdout.trim();
        }
    }
    else if (typeof Deno === "object") {
        return await questionInDeno(message + " ", options);
    }
    else {
        return await questionInNode(message + " ", options);
    }
}

export { promptInTerminal as default };
//# sourceMappingURL=prompt.js.map
