import { questionInDeno, questionInNode } from "./index.ts";
import { escape, platform, run } from "./util.ts";

function createAppleScript(message: string, defaultValue = "", password = false) {
    return "tell application (path to frontmost application as text)\n" +
        `  set response to display dialog "${escape(message)}" with title "Prompt"`
        + ` default answer "${escape(defaultValue)}"`
        + `${password ? " hidden answer true" : ""}\n` +
        "  return text returned of response\n" +
        "end";
}

function createPowerShellScript(message: string, defaultValue = "", password = false) {
    return [
        "$form = New-Object System.Windows.Forms.Form",
        "$form.Text = 'Prompt'",
        "$form.Size = New-Object System.Drawing.Size(450,200)",
        "$form.StartPosition = 'CenterScreen'",
        "",
        "$label = New-Object System.Windows.Forms.Label",
        "$label.Location = New-Object System.Drawing.Point(10,20)",
        "$label.Size = New-Object System.Drawing.Size(400,20)",
        `$label.Text = "${escape(message)}"`,
        "$form.Controls.Add($label)",
        "",
        "$textBox = New-Object System.Windows.Forms.TextBox",
        "$textBox.Location = New-Object System.Drawing.Point(10,40)",
        "$textBox.Size = New-Object System.Drawing.Size(400,20)",
        `$textBox.UseSystemPasswordChar = ${password ? "$true" : "$false"}`,
        `$textBox.Text = "${escape(defaultValue)}"`,
        "$form.Controls.Add($textBox)",
        "",
        "$cancelButton = New-Object System.Windows.Forms.Button",
        "$cancelButton.Location = New-Object System.Drawing.Point(100,70)",
        "$cancelButton.Size = New-Object System.Drawing.Size(75,23)",
        "$cancelButton.Text = 'Cancel'",
        "$cancelButton.DialogResult = [System.Windows.Forms.DialogResult]::Cancel",
        "$form.Controls.Add($cancelButton)",
        "",
        "$okButton = New-Object System.Windows.Forms.Button",
        "$okButton.Location = New-Object System.Drawing.Point(175,70)",
        "$okButton.Size = New-Object System.Drawing.Size(75,23)",
        "$okButton.Text = 'OK'",
        "$okButton.DialogResult = [System.Windows.Forms.DialogResult]::OK",
        "$form.Controls.Add($okButton)",
        "",
        "$form.AcceptButton = $okButton",
        "",
        "$form.Topmost = $true",
        "$form.Add_Shown({$textBox.Select()})",
        "",
        "$result = $form.ShowDialog()",
        "",
        "if ($result -eq [System.Windows.Forms.DialogResult]::OK)",
        "{",
        "    $textBox.Text",
        "}",
        "elseif ($result -eq [System.Windows.Forms.DialogResult]::Cancel)",
        "{",
        "    throw 'User canceled'",
        "}",
    ].join("\n");
}

export default async function promptInTerminal(message: string, options: {
    defaultValue?: string | undefined;
    type?: "text" | "password";
    mask?: string | undefined;
    gui?: boolean;
} = {}): Promise<string | null> {
    if (options?.gui && platform() === "darwin") {
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
    } else if (options?.gui && platform() === "linux") {
        const args = [
            "--entry",
            "--title", "Prompt",
            "--width", "450",
        ];

        if (message) {
            args.push("--text", message);
        }

        if (options.defaultValue) {
            args.push("--entry-text", options.defaultValue);
        }

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
    } else if (options?.gui && platform() === "windows") {
        const { code, stdout, stderr } = await run("powershell", [
            "-Command",
            createPowerShellScript(message, options.defaultValue, options.type === "password")
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
    } else if (typeof Deno === "object") {
        return await questionInDeno(message + " ", options);
    } else {
        return await questionInNode(message + " ", options);
    }
}
