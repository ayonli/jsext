import { isMainThread } from "../env/index.ts";
import { throwUnsupportedRuntimeError } from "../error/index.ts";
import { ThreadedFunctions } from "../parallel/index.ts";

function parallel<M extends { [x: string]: any; }>(
    module: string | (() => Promise<M>)
): ThreadedFunctions<M> {
    void module;
    throwUnsupportedRuntimeError();
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
