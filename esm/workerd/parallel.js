import { isMainThread } from '../env.js';
import { throwUnsupportedRuntimeError } from '../error.js';

function parallel(module) {
    throwUnsupportedRuntimeError();
}
(function (parallel) {
    parallel.maxWorkers = undefined;
    parallel.workerEntry = undefined;
    parallel.isMainThread = false;
})(parallel || (parallel = {}));
Object.defineProperty(parallel, "isMainThread", {
    value: isMainThread,
    writable: false,
});
var parallel$1 = parallel;

export { parallel$1 as default };
//# sourceMappingURL=parallel.js.map
