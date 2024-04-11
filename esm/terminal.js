import { text } from './bytes.js';
import { interop } from './module.js';

/**
 * Useful utility functions for interacting with the terminal.
 *
 * NOTE: this module is not intended to be used in the browser.
 * @module
 */
const PopularPlatforms = [
    "android",
    "darwin",
    "freebsd",
    "linux",
    "windows",
];
/**
 * Returns a string identifying the operating system platform in which the
 * program is running.
 */
function platform() {
    if (typeof Deno === "object") {
        if (PopularPlatforms.includes(Deno.build.os)) {
            return Deno.build.os;
        }
        else {
            return "others";
        }
    }
    else if (typeof process === "object" && typeof process.platform === "string") {
        if (process.platform === "win32") {
            return "windows";
        }
        else if (PopularPlatforms.includes(process.platform)) {
            return process.platform;
        }
        else {
            return "others";
        }
    }
    else if (typeof navigator === "object" && typeof navigator.userAgent === "string") {
        if (navigator.userAgent.includes("Android")) {
            return "android";
        }
        else if (navigator.userAgent.includes("Macintosh")) {
            return "darwin";
        }
        else if (navigator.userAgent.includes("Windows")) {
            return "windows";
        }
        else if (navigator.userAgent.includes("Linux")) {
            return "linux";
        }
        else {
            return "others";
        }
    }
    else {
        return "others";
    }
}
/**
 * Executes a command in the terminal and returns the exit code and outputs.
 */
async function run(cmd, args) {
    var _a;
    const isWindows = platform() === "windows";
    if (typeof Deno === "object") {
        const { Buffer } = await import('node:buffer');
        // @ts-ignore
        const { decode } = await interop(import('npm:iconv-lite'), false);
        const _cmd = new Deno.Command(cmd, { args });
        const { code, stdout, stderr } = await _cmd.output();
        return {
            code,
            stdout: isWindows ? decode(Buffer.from(stdout), "cp936") : text(stdout),
            stderr: isWindows ? decode(Buffer.from(stderr), "cp936") : text(stderr),
        };
    }
    else if (typeof process === "object" && !!((_a = process.versions) === null || _a === void 0 ? void 0 : _a.node)) {
        const { spawn } = await import('child_process');
        const { decode } = await interop(import('iconv-lite'), false);
        const child = spawn(cmd, args);
        const stdout = [];
        const stderr = [];
        child.stdout.on("data", chunk => {
            if (isWindows) {
                stdout.push(decode(chunk, "cp936"));
            }
            else {
                stdout.push(String(chunk));
            }
        });
        child.stderr.on("data", chunk => {
            if (isWindows) {
                stderr.push(decode(chunk, "cp936"));
            }
            else {
                stderr.push(String(chunk));
            }
        });
        const code = await new Promise((resolve) => {
            child.on("exit", (code, signal) => {
                if (code === null && signal) {
                    resolve(1);
                }
                else {
                    resolve(code !== null && code !== void 0 ? code : 0);
                }
            });
        });
        return {
            code,
            stdout: stdout.join(""),
            stderr: stderr.join(""),
        };
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
/**
 * Returns the path of the given command if it exists in the system,
 * otherwise returns `null`.
 */
async function which(cmd) {
    if (platform() === "windows") {
        const { code, stdout } = await run("powershell", [
            "-Command",
            `Get-Command -Name ${cmd} | Select-Object -ExpandProperty Source`
        ]);
        return code ? null : stdout.trim();
    }
    else {
        const { code, stdout } = await run("which", [cmd]);
        return code ? null : stdout.trim();
    }
}

export { PopularPlatforms, platform, run, which };
//# sourceMappingURL=terminal.js.map
