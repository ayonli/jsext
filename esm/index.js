import _try from './try.js';
import func from './func.js';
import wrap from './wrap.js';
import mixin from './mixin.js';
import throttle from './throttle.js';
import debounce from './debounce.js';
import queue from './queue.js';
export { Queue } from './queue.js';
import lock from './lock.js';
export { Mutex } from './lock.js';
import read from './read.js';
import readAll from './readAll.js';
import chan from './chan.js';
export { Channel } from './chan.js';
import parallel from './parallel.js';
import run from './run.js';
import example from './example.js';
import deprecate from './deprecate.js';
import { isClass as isClass$1, isSubclassOf as isSubclassOf$1 } from './class.js';

const AsyncFunction = (async function () { }).constructor;
const AsyncGeneratorFunction = (async function* () { }).constructor;
/**
 * The entry of jsext major functions.
 */
const jsext = {
    _try,
    /** @deprecated use `_try` instead */
    try: _try,
    func,
    wrap,
    mixin,
    throttle,
    debounce,
    queue,
    lock,
    read,
    readAll,
    chan,
    parallel,
    run,
    example,
    deprecate,
    /** @deprecated import `isClass` from `@ayonli/jsext/class` instead. */
    isClass: isClass$1,
    /** @deprecated import `isSubclassOf` from `@ayonli/jsext/class` instead. */
    isSubclassOf: isSubclassOf$1,
    /** @deprecated use `mixin` instead */
    mixins: mixin,
};
/** @deprecated import `isClass` from `@ayonli/jsext/class` instead. */
const isClass = isClass$1;
/** @deprecated import `isSubclassOf` from `@ayonli/jsext/class` instead. */
const isSubclassOf = isSubclassOf$1;
/** @deprecated use `mixin` instead */
const mixins = mixin;

export { AsyncFunction, AsyncGeneratorFunction, _try, chan, debounce, jsext as default, deprecate, example, func, isClass, isSubclassOf, lock, mixin, mixins, parallel, queue, read, readAll, run, throttle, wrap };
//# sourceMappingURL=index.js.map
