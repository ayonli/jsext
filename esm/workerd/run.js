import '../bytes.js';
import '../error/Exception.js';
import '../external/event-target-polyfill/index.js';
import { NotImplementedError } from '../error/common.js';

async function run(script, args, options) {
    throw new NotImplementedError("Unsupported runtime");
}
(function (run) {
    run.maxWorkers = undefined;
})(run || (run = {}));
var run$1 = run;

export { run$1 as default };
//# sourceMappingURL=run.js.map
