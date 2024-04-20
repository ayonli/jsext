import _try from "./try.ts";
import func from "./func.ts";
import wrap from "./wrap.ts";
import mixin from "./mixin.ts";
import throttle from "./throttle.ts";
import debounce from "./debounce.ts";
import queue, { Queue as _Queue } from "./queue.ts";
import lock, { Mutex as _Mutex } from "./lock.ts";
import read from "./read.ts";
import readAll from "./readAll.ts";
import chan, { Channel as _Channel } from "./chan.ts";
import parallel from "./parallel.ts";
import run from "./run.ts";
import example from "./example.ts";
import deprecate from "./deprecate.ts";
import { isClass as _isClass, isSubclassOf as _isSubclassOf } from "./class.ts";
export * from "./types.ts";

/** @deprecated import `Queue` from `@ayonli/jsext/queue` instead. */
export const Queue = _Queue;

/** @deprecated import `Mutex` from `@ayonli/jsext/lock` instead. */
export const Mutex = _Mutex;

/** @deprecated import `Channel` from `@ayonli/jsext/chan` instead. */
export const Channel = _Channel;

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
    isClass: _isClass,
    /** @deprecated import `isSubclassOf` from `@ayonli/jsext/class` instead. */
    isSubclassOf: _isSubclassOf,
    /** @deprecated use `mixin` instead */
    mixins: mixin,
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
    read,
    readAll,
    chan,
    parallel,
    run,
    example,
    deprecate,
};

/** @deprecated import `isClass` from `@ayonli/jsext/class` instead. */
export const isClass = _isClass;

/** @deprecated import `isSubclassOf` from `@ayonli/jsext/class` instead. */
export const isSubclassOf = _isSubclassOf;

/** @deprecated use `mixin` instead */
export const mixins = mixin;
