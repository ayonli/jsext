import { questionInDeno, questionInNode } from "./index.ts";
import { escape, platform, which } from "./util.ts";
import { run } from "./util.ts";

function createAppleScript(message: string) {
    return "tell application (path to frontmost application as text)\n" +
        `  display dialog "${escape(message)}" buttons {"OK"} default button "OK"\n` +
        "end";
}

function createPowerShellScript(message: string) {
    return "Add-Type -AssemblyName PresentationFramework;"
        + `[System.Windows.MessageBox]::Show("${escape(message)}");`;
}

export default async function alertInTerminal(message: string, options: {
    preferGUI?: boolean;
} = {}): Promise<void> {
    if (options?.preferGUI && platform() === "darwin" && (await which("osascript"))) {
        const { code, stderr } = await run("osascript", [
            "-e",
            createAppleScript(message)
        ]);

        if (code) {
            throw new Error(stderr);
        }
    } else if (options?.preferGUI && platform() === "linux" && (await which("zenity"))) {
        const { code, stderr } = await run("zenity", [
            "--info",
            "--text", message,
        ]);

        if (code && code !== 1) {
            throw new Error(stderr);
        }
    } else if (options?.preferGUI && platform() === "windows") {
        const { code, stderr } = await run("powershell", [
            "-Command",
            createPowerShellScript(message)
        ]);

        if (code) {
            throw new Error(stderr);
        }
    } else if (typeof Deno === "object") {
        await questionInDeno(message + " [Enter] ");
    } else {
        await questionInNode(message + " [Enter] ");
    }
}
