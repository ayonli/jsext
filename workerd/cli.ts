/**
 * Function stubs for Cloudflare Workers.
 * @module
 */

export * from "../cli/common.ts";

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
    gui?: boolean;
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
