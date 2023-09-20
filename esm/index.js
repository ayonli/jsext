import _try from './try.js';
import func from './func.js';
import wrap from './wrap.js';
import throttle from './throttle.js';
import mixins from './mixins.js';
import isSubclassOf from './isSubclassOf.js';
import read from './read.js';
import run from './run.js';
import example from './example.js';

const AsyncFunction = (async function () { }).constructor;
const AsyncGeneratorFunction = (async function* () { }).constructor;
/**
 * The entry of jsext main functions.
 */
const jsext = {
    try: _try,
    func,
    wrap,
    throttle,
    mixins,
    isSubclassOf,
    read,
    run,
    example,
};

export { AsyncFunction, AsyncGeneratorFunction, _try, jsext as default, example, func, isSubclassOf, mixins, read, run, throttle, wrap };
//# sourceMappingURL=index.js.map
