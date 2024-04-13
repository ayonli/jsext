import { questionInDeno, questionInNode } from "./index.ts";
import { escape } from "./util.ts";
import { platform, run } from "../../cli.ts";

function createAppleScript(message: string) {
    return "tell application (path to frontmost application as text)\n" +
        `  display dialog "${escape(message)}" with title "Alert" buttons {"OK"} default button "OK"\n` +
        "end";
}

function createPowerShellScript(message: string) {
    return "Add-Type -AssemblyName PresentationFramework;"
        + `[System.Windows.MessageBox]::Show("${escape(message)}", "Alert");`;
}

export default async function alertInTerminal(message: string, options: {
    gui?: boolean;
} = {}): Promise<void> {
    if (options?.gui && platform() === "darwin") {
        const { code, stderr } = await run("osascript", [
            "-e",
            createAppleScript(message)
        ]);

        if (code) {
            throw new Error(stderr);
        }
    } else if (options?.gui && platform() === "linux") {
        const args = [
            "--info",
            "--title", "Alert",
            "--width", "365",
        ];

        if (message) {
            args.push("--text", message);
        }

        const { code, stderr } = await run("zenity", args);

        if (code && code !== 1) {
            throw new Error(stderr);
        }
    } else if (options?.gui && platform() === "windows") {
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
