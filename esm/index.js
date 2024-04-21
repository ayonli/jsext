import _try from './try.js';
import func from './func.js';
import wrap from './wrap.js';
import mixin from './mixin.js';
import throttle from './throttle.js';
import debounce from './debounce.js';
import queue, { Queue as Queue$1 } from './queue.js';
import lock, { Mutex as Mutex$1 } from './lock.js';
import read from './read.js';
import readAll from './readAll.js';
import chan, { Channel as Channel$1 } from './chan.js';
import parallel from './parallel.js';
import run from './run.js';
import example from './example.js';
import deprecate from './deprecate.js';
import pipe from './pipe.js';
import { isClass as isClass$1, isSubclassOf as isSubclassOf$1 } from './class.js';
export { AsyncFunction, AsyncGeneratorFunction } from './types.js';

/** @deprecated import `Queue` from `@ayonli/jsext/queue` instead. */
const Queue = Queue$1;
/** @deprecated import `Mutex` from `@ayonli/jsext/lock` instead. */
const Mutex = Mutex$1;
/** @deprecated import `Channel` from `@ayonli/jsext/chan` instead. */
const Channel = Channel$1;
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
    pipe,
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

export { Channel, Mutex, Queue, _try, chan, debounce, jsext as default, deprecate, example, func, isClass, isSubclassOf, lock, mixin, mixins, parallel, pipe, queue, read, readAll, run, throttle, wrap };
//# sourceMappingURL=index.js.map
