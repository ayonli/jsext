import _try from './try.js';
import func from './func.js';
import wrap from './wrap.js';
import throttle from './throttle.js';
import mixins, { isSubclassOf } from './mixins.js';
import chan from './chan.js';
export { Channel } from './chan.js';
import queue from './queue.js';
export { Queue } from './queue.js';
import read, { readAll } from './read.js';
import run from './run.js';
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
    mixins,
    isSubclassOf,
    chan,
    queue,
    read,
    readAll,
    run,
    example,
    deprecate,
};

export { AsyncFunction, AsyncGeneratorFunction, _try, chan, jsext as default, deprecate, example, func, isSubclassOf, mixins, queue, read, readAll, run, throttle, wrap };
//# sourceMappingURL=index.js.map
