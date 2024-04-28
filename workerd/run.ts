import parallel from "./parallel";

async function run<R, A extends any[] = any[]>(script: string, args?: A, options?: {
    fn?: string;
    timeout?: number;
    keepAlive?: boolean;
    adapter?: "worker_threads" | "child_process";
}): Promise<{
    workerId: number;
    result(): Promise<R>;
    iterate(): AsyncIterable<R>;
    abort(reason?: Error | null): Promise<void>;
}> {
    void script, args, options;
    throw new Error("Unsupported runtime");
}

namespace run {
    export var maxWorkers: number | undefined = undefined;
    /** @deprecated set {@link parallel.workerEntry} instead */
    export var workerEntry: string | undefined = undefined;
}
// backward compatibility
Object.defineProperties(run, {
    workerEntry: {
        set(v) {
            parallel.workerEntry = v;
        },
        get() {
            return parallel.workerEntry;
        },
    },
});

export default run;
