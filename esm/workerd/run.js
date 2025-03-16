import { throwUnsupportedRuntimeError } from '../error.js';

async function run(script, args, options) {
    throwUnsupportedRuntimeError();
}
(function (run) {
    run.maxWorkers = undefined;
})(run || (run = {}));
var run$1 = run;

export { run$1 as default };
//# sourceMappingURL=run.js.map
