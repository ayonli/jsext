import { throwUnsupportedRuntimeError } from "../error.ts";
import { RunOptions, WorkerTask } from "../run.ts";

export type { RunOptions, WorkerTask };

async function run<R, A extends any[] = any[]>(
    script: string,
    args?: A,
    options?: RunOptions
): Promise<WorkerTask<R>> {
    void script, args, options;
    throwUnsupportedRuntimeError();
}

namespace run {
    export var maxWorkers: number | undefined = undefined;
}

export default run;
