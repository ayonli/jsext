import { questionInDeno, questionInNode } from "./index.ts";
import { escape, platform, run, which } from "./util.ts";

function createAppleScript(message: string) {
    return "tell application (path to frontmost application as text)\n" +
        `  display dialog "${escape(message)}" with title "Confirm"`
        + ` buttons {"Cancel", "OK"} default button "OK"\n` +
        "end";
}

function createPowerShellScript(message: string) {
    return "Add-Type -AssemblyName PresentationFramework;"
        + `[System.Windows.MessageBox]::Show("${escape(message)}", "Confirm", "YesNo");`;
}

export default async function confirmInTerminal(message: string, options: {
    preferGUI?: boolean;
} = {}): Promise<boolean> {
    if (options?.preferGUI && platform() === "darwin" && (await which("osascript"))) {
        const { code, stderr } = await run("osascript", [
            "-e",
            createAppleScript(message)
        ]);

        if (code) {
            if (stderr.includes("User canceled")) {
                return false;
            } else {
                throw new Error(stderr);
            }
        } else {
            return true;
        }
    } else if (options?.preferGUI && platform() === "linux" && (await which("zenity"))) {
        const { code, stderr } = await run("zenity", [
            "--question",
            "--text", message,
        ]);

        if (!code) {
            return true;
        } else if (code === 1) {
            return false;
        } else {
            throw new Error(stderr);
        }
    } else if (options?.preferGUI && platform() === "windows") {
        const { code, stdout, stderr } = await run("powershell", [
            "-Command",
            createPowerShellScript(message)
        ]);

        if (code) {
            throw new Error(stderr);
        } else {
            return stdout.trim() === "Yes" ? true : false;
        }
    } else {
        let answer: string | null;

        if (typeof Deno === "object") {
            answer = await questionInDeno(message + " [Y/n] ");
        } else {
            answer = await questionInNode(message + " [Y/n] ");
        }

        const ok = answer?.toLowerCase().trim();
        return ok === "" || ok === "y" || ok === "yes";
    }
}
