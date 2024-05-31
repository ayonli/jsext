export * from "../cli/common.ts";

export interface CommandResult {
    /**
     * The exit code of the command. A non-zero value indicates an error.
     */
    code: number;
    /**
     * The standard output of the command, may end with a newline character.
     */
    stdout: string;
    stderr: string;
};

export async function run(cmd: string, args: string[]): Promise<CommandResult> {
    void cmd, args;
    throw new Error("Unsupported runtime");
}

export async function powershell(script: string): Promise<CommandResult> {
    void script;
    throw new Error("Unsupported runtime");
}

export interface SudoOptions {
    gui?: boolean;
    title?: string;
};

export async function sudo(
    cmd: string,
    args: string[],
    options: SudoOptions = {}
): Promise<CommandResult> {
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
