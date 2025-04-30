import _try from './try.js';
import func from './func.js';
import once from './once.js';
import wrap from './wrap.js';
import mixin from './mixin.js';
import throttle from './throttle.js';
import debounce from './debounce.js';
import queue from './queue.js';
import lock from './lock.js';
import chan from './chan.js';
import parallel from './parallel.js';
import run from './run.js';
import deprecate from './deprecate.js';
import pipe from './pipe.js';
export { AsyncFunction, AsyncGeneratorFunction, GeneratorFunction, TypedArray } from './types.js';

/**
 * The entry of jsext major functions.
 */
const jsext = {
    /**
     * @deprecated Import `_try` from `@ayonli/jsext/try` instead.
     */
    _try,
    /**
     * @deprecated Import `_try` from `@ayonli/jsext/try` instead.
     */
    try: _try,
    func,
    once,
    wrap,
    mixin,
    throttle,
    debounce,
    queue,
    lock,
    chan,
    parallel,
    run,
    deprecate,
    pipe,
};

export { _try, chan, debounce, jsext as default, deprecate, func, lock, mixin, once, parallel, pipe, queue, run, throttle, wrap };
//# sourceMappingURL=index.js.map
