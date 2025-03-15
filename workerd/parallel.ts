import { isMainThread } from "../env.ts";
import { NotImplementedError } from "../error.ts";
import { ThreadedFunctions } from "../parallel.ts";

function parallel<M extends { [x: string]: any; }>(
    module: string | (() => Promise<M>)
): ThreadedFunctions<M> {
    void module;
    throw new NotImplementedError("Unsupported runtime");
}

namespace parallel {
    export var maxWorkers: number | undefined = undefined;
    export var workerEntry: string | undefined = undefined;
    export const isMainThread: boolean = false;
}

Object.defineProperty(parallel, "isMainThread", {
    value: isMainThread,
    writable: false,
});

export default parallel;
