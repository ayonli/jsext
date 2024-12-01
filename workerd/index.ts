import _try from "../try.ts";
import func from "../func.ts";
import wrap from "../wrap.ts";
import mixin from "../mixin.ts";
import throttle from "../throttle.ts";
import debounce from "../debounce.ts";
import queue, { Queue as _Queue } from "../queue.ts";
import lock, { Mutex as _Mutex } from "../lock.ts";
import chan, { Channel as _Channel } from "../chan.ts";
import parallel from "./parallel.ts";
import run from "./run.ts";
import deprecate from "../deprecate.ts";
import pipe from "../pipe.ts";
export * from "../types.ts";

/**
 * The entry of jsext major functions.
 */
const jsext = {
    _try,
    /** @deprecated Use `_try` instead */
    try: _try,
    func,
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

export {
    jsext as default,
    _try,
    func,
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
