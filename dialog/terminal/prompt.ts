import { questionInDeno, questionInNode } from "./index.ts";
import { escape, platform, run, which } from "./util.ts";

function createAppleScript(message: string, defaultValue = "", password = false) {
    return "tell application (path to frontmost application as text)\n" +
        `  set response to display dialog "${escape(message)}" default answer "${escape(defaultValue)}" `
        + `${password ? "hidden answer true" : ""}\n` +
        "  return text returned of response\n" +
        "end";
}

function createPowerShellScript(message: string, defaultValue = "", password = false) {
    void password; // password is not supported in PowerShell
    return "Add-Type -AssemblyName Microsoft.VisualBasic;"
        + `[Microsoft.VisualBasic.Interaction]::InputBox("${escape(message)}", "Prompt", "${escape(defaultValue)}");`;
}

export default async function promptInTerminal(message: string, options: {
    defaultValue?: string | undefined;
    type?: "text" | "password";
    mask?: string | undefined;
    preferGUI?: boolean;
} = {}): Promise<string | null> {
    if (options?.preferGUI && platform() === "darwin" && (await which("osascript"))) {
        const { code, stdout, stderr } = await run("osascript", [
            "-e",
            createAppleScript(message, options.defaultValue, options.type === "password")
        ]);

        if (code) {
            if (stderr.includes("User canceled")) {
                return null;
            } else {
                throw new Error(stderr);
            }
        } else {
            return stdout.trim();
        }
    } else if (options?.preferGUI && platform() === "linux" && (await which("zenity"))) {
        const args = [
            "--entry",
            "--text", message,
            "--entry-text", options.defaultValue ?? ""
        ];

        if (options.type === "password") {
            args.push("--hide-text");
        }

        const { code, stdout, stderr } = await run("zenity", args);

        if (!code) {
            return stdout.trim();
        } else if (code === 1) {
            return null;
        } else {
            throw new Error(stderr);
        }
    } else if (options?.preferGUI && platform() === "windows") {
        const { code, stdout, stderr } = await run("powershell", [
            "-Command",
            createPowerShellScript(message, options.defaultValue, options.type === "password")
        ]);

        if (code) {
            throw new Error(stderr);
        } else {
            return stdout.trim();
        }
    } else if (typeof Deno === "object") {
        return await questionInDeno(message + " ", options);
    } else {
        return await questionInNode(message + " ", options);
    }
}