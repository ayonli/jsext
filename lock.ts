import BiMap from "./collections/BiMap.ts";

if (typeof Symbol.dispose === "undefined") {
    Object.defineProperty(Symbol, "dispose", { value: Symbol("Symbol.dispose") });
}

const _value = Symbol.for("value");

/**
 * Mutual Exclusion prevents multiple coroutines from accessing the same shared
 * resource simultaneously.
 * 
 * NOTE: currently, the Mutex instance can not be used across multiple threads,
 * but is considering adding support for `parallel` threads.
 * 
 * @example
 * ```ts
 * import { Mutex } from "@ayonli/jsext/lock";
 * import func from "@ayonli/jsext/func";
 * import { random } from "@ayonli/jsext/number";
 * import { sleep } from "@ayonli/jsext/promise";
 * 
 * const mutex = new Mutex(1);
 * 
 * const concurrentOperation = func(async (defer) => {
 *     const shared = await mutex.lock();
 *     defer(() => shared.unlock()); // don't forget to unlock
 * 
 *     const value1 = shared.value;
 * 
 *     await otherAsyncOperations();
 * 
 *     shared.value += 1
 *     const value2 = shared.value;
 * 
 *     // Without mutex lock, the shared value may have been modified by other
 *     // calls during `await otherAsyncOperation()`, and the following
 *     // assertion will fail.
 *     console.assert(value1 + 1 === value2);
 * });
 * 
 * async function otherAsyncOperations() {
 *     await sleep(100 * random(1, 10));
 * }
 *
 * await Promise.all([
 *     concurrentOperation(),
 *     concurrentOperation(),
 *     concurrentOperation(),
 *     concurrentOperation(),
 * ]);
 * ```
 */
export class Mutex<T> {
    private queue: (() => void)[] = [];
    private [_value]: T;

    /**
     * @param value The data associated to the mutex instance.
     */
    constructor(value: T) {
        this[_value] = value;
    }

    /**
     * Acquires the lock of the mutex, optionally for modifying the shared
     * resource.
     */
    async lock() {
        await new Promise<void>(resolve => {
            if (this.queue.length) {
                this.queue.push(resolve);
            } else {
                this.queue.push(resolve);
                resolve();
            }
        });

        const lock = Object.create(Mutex.Lock.prototype) as Mutex.Lock<T>;
        lock["mutex"] = this;
        return lock;
    }
}

export namespace Mutex {
    export abstract class Lock<T> {
        constructor(private mutex: Mutex<T>) { }

        /** Accesses the data associated to the mutex instance. */
        get value() {
            return this.mutex[_value];
        }

        set value(v) {
            this.mutex[_value] = v;
        }

        /** Releases the current lock of the mutex. */
        async unlock() {
            const queue = this.mutex["queue"];
            queue.shift();
            const next = queue[0];

            if (next) {
                next();
            } else if (registry.hasValue(this.mutex as any)) {
                registry.deleteValue(this.mutex as any);
            }
        }

        [Symbol.dispose]() {
            this.unlock();
        }
    }
}

const registry = new BiMap<any, Mutex<undefined>>();

/**
 * Acquires a mutex lock for the given key in order to perform concurrent
 * operations and prevent conflicts.
 * 
 * If the key is currently being locked by other coroutines, this function will
 * block until the lock becomes available again.
 * 
 * @example
 * ```ts
 * import lock from "@ayonli/jsext/lock";
 * import func from "@ayonli/jsext/func";
 * 
 * const key = "lock_key";
 * 
 * export const concurrentOperation = func(async (defer) => {
 *     const ctx = await lock(key);
 *     defer(() => ctx.unlock()); // don't forget to unlock
 * 
 *     // This block will never be run if there are other coroutines holding
 *     // the lock.
 *     //
 *     // Other coroutines trying to lock the same key will also never be run
 *     // before `unlock()`.
 * });
 * ```
 */
export default async function lock(key: any): Promise<Mutex.Lock<undefined>> {
    let mutex = registry.get(key);

    if (!mutex) {
        registry.set(key, mutex = new Mutex(void 0));
    }

    return await mutex.lock();
}