import BiMap from "./collections/BiMap.ts";

if (typeof Symbol.dispose === "undefined") {
    Object.defineProperty(Symbol, "dispose", { value: Symbol("Symbol.dispose") });
}

const _value = Symbol.for("value");

/**
 * AsyncMutex is a mutual exclusion (mutex) implementation for async JavaScript,
 * which prevents multiple coroutines from accessing the same shared resource
 * simultaneously.
 * 
 * @example
 * ```ts
 * import { random } from "@ayonli/jsext/numbers";
 * import { sleep } from "@ayonli/jsext/promise";
 * import { AsyncMutex } from "@ayonli/jsext/lock";
 * 
 * const mutex = new AsyncMutex(1);
 * 
 * async function concurrentOperation() {
 *     const ctx = await mutex.lock();
 *     const value1 = ctx.value;
 * 
 *     await otherAsyncOperations();
 * 
 *     ctx.value += 1
 *     const value2 = ctx.value;
 * 
 *     console.assert(value1 + 1 === value2);
 * 
 *     ctx.release();
 * }
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
export class AsyncMutex<T> {
    private queue: (() => void)[] = [];
    private [_value]: T;

    /**
     * @param value The data associated to the mutex instance.
     */
    constructor(value: T) {
        this[_value] = value;
    }

    /** Acquires the lock of the mutex, optionally for modifying the shared resource.  */
    async lock() {
        await new Promise<void>(resolve => {
            if (this.queue.length) {
                this.queue.push(resolve);
            } else {
                this.queue.push(resolve);
                resolve();
            }
        });

        const lock = Object.create(AsyncMutex.Lock.prototype) as AsyncMutex.Lock<T>;
        lock["mutex"] = this;
        return lock;
    }
}

export namespace AsyncMutex {
    export abstract class Lock<T> {
        constructor(private mutex: AsyncMutex<T>) { }

        /** Accesses the data associated to the mutex instance. */
        get value() {
            return this.mutex[_value];
        }

        set value(v) {
            this.mutex[_value] = v;
        }

        /** Releases the current lock of the mutex. */
        async release() {
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
            this.release();
        }
    }
}

const registry = new BiMap<any, AsyncMutex<undefined>>();

/**
 * Acquires lock for the given key in order to perform concurrent operations and prevent conflicts.
 * 
 * If the key is currently being locked by other coroutines, this function will block until the
 * lock is available again.
 * 
 * @example
 * ```ts
 * import lock from "@ayonli/jsext/lock";
 * 
 * const key = "lock-key";
 * 
 * async function someAsyncOperation() {
 *     const ctx = await lock(key);
 * 
 *     // This block will never be run if there are other coroutines holding
 *     // the lock.
 *     //
 *     // Other coroutines trying to lock the same key will also never be run
 *     // before `release()`.
 * 
 *     ctx.release();
 * }
 * ```
 */
export default async function lock(key: any): Promise<AsyncMutex.Lock<undefined>> {
    let mutex = registry.get(key);

    if (!mutex) {
        registry.set(key, mutex = new AsyncMutex(void 0));
    }

    return await mutex.lock();
}
