import _try from "../try/index.ts";
import func from "../func/index.ts";
import wrap from "../wrap/index.ts";
import mixin from "../mixin/index.ts";
import throttle from "../throttle/index.ts";
import debounce from "../debounce/index.ts";
import queue, { Queue as _Queue } from "../queue/index.ts";
import lock, { Mutex as _Mutex } from "../lock/index.ts";
import chan, { Channel as _Channel } from "../chan/index.ts";
import parallel from "./parallel.ts";
import run from "./run.ts";
import deprecate from "../deprecate/index.ts";
import pipe from "../pipe/index.ts";
export * from "../types/index.ts";

export * from "./types.ts";

/**
 * The entry of jsext major functions.
 */
const jsext = {
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
