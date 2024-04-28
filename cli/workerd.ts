/**
 * Function stubs for Cloudflare Workers.
 * @module
 */

export * from "./common.ts";

export async function run(cmd: string, args: string[]): Promise<{
    code: number;
    stdout: string;
    stderr: string;
}> {
    void cmd, args;
    throw new Error("Unsupported runtime");
}

export async function powershell(script: string): Promise<{
    code: number;
    stdout: string;
    stderr: string;
}> {
    void script;
    throw new Error("Unsupported runtime");
}

export async function sudo(cmd: string, args: string[], options: {
    /**
     * By default, this function will use the `sudo` command when available and
     * running in text mode. Set this option to `true` to force using the GUI
     * prompt instead.
     * 
     * NOTE: this option is not available and will be ignored in Windows
     * Subsystem for Linux.
     */
    gui?: boolean;
    /** Custom the dialog's title when `gui` option is set. */
    title?: string;
} = {}): Promise<{
    code: number;
    stdout: string;
    stderr: string;
}> {
    void cmd, args, options;
    throw new Error("Unsupported runtime");
}

export async function which(cmd: string): Promise<string | null> {
    void cmd;
    throw new Error("Unsupported runtime");
}

export async function edit(filename: string): Promise<void> {
    void filename;
    throw new Error("Unsupported runtime");
}
