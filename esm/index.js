import _try from './try.js';
import func from './func.js';
import wrap from './wrap.js';
import throttle from './throttle.js';
import debounce from './debounce.js';
import mixins from './mixins.js';
import isClass, { isSubclassOf } from './isclass.js';
import chan from './chan.js';
export { Channel } from './chan.js';
import queue from './queue.js';
export { Queue } from './queue.js';
import lock from './lock.js';
export { Mutex } from './lock.js';
import read, { readAll } from './read.js';
import run from './run.js';
import parallel from './parallel.js';
import example from './example.js';
import deprecate from './deprecate.js';

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
    debounce,
    mixins,
    isClass,
    isSubclassOf,
    chan,
    queue,
    lock,
    read,
    readAll,
    run,
    parallel,
    example,
    deprecate,
};

export { AsyncFunction, AsyncGeneratorFunction, _try, chan, debounce, jsext as default, deprecate, example, func, isClass, isSubclassOf, lock, mixins, parallel, queue, read, readAll, run, throttle, wrap };
//# sourceMappingURL=index.js.map
