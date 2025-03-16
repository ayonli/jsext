import type { CommandResult, SudoOptions } from "../cli.ts";
import { throwUnsupportedRuntimeError } from "../error.ts";

export type { CommandResult };
export * from "../cli/common.ts";

export async function run(cmd: string, args: string[]): Promise<CommandResult> {
    void cmd, args;
    throwUnsupportedRuntimeError();
}

export async function powershell(script: string): Promise<CommandResult> {
    void script;
    throwUnsupportedRuntimeError();
}

export async function sudo(
    cmd: string,
    args: string[],
    options: SudoOptions = {}
): Promise<CommandResult> {
    void cmd, args, options;
    throwUnsupportedRuntimeError();
}

export async function which(cmd: string): Promise<string | null> {
    void cmd;
    throwUnsupportedRuntimeError();
}

export async function edit(filename: string): Promise<void> {
    void filename;
    throwUnsupportedRuntimeError();
}
