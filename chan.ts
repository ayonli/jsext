import { sequence } from "./number/index.ts";

const idGenerator = sequence(1, Number.MAX_SAFE_INTEGER);
export const id = Symbol.for("id");

export class Channel<T> implements AsyncIterable<T> {
    readonly [id] = idGenerator.next().value;
    /** The capacity is the maximum number of data allowed to be buffered. */
    readonly capacity: number;
    private buffer: T[] = [];
    private producers: (() => T)[] = [];
    private consumers: ((err: Error | null, data?: T) => void)[] = [];
    private error?: Error | null = null;
    private state: 0 | 1 | 2 = 1;

    constructor(capacity = 0) {
        if (capacity < 0) {
            throw new RangeError("the capacity of a channel must not be negative");
        }

        this.capacity = capacity;
    }

    /**
     * Pushes data to the channel.
     * 
     * If there is a receiver, the data will be consumed immediately. Otherwise:
     * 
     * - If this is an non-buffered channel, this function will block until a receiver is
     *  available and the data is consumed.
     * 
     * - If this is a buffered channel, then:
     *      - If the buffer size is within the capacity, the data will be pushed to the buffer.
     *      - Otherwise, this function will block until there is new space for the data in the
     *          buffer.
     */
    push(data: T): Promise<void> {
        if (this.state !== 1) {
            throw new Error("the channel is closed");
        } else if (this.consumers.length) {
            const consume = this.consumers.shift() as (err: Error | null, data?: T) => void;
            return Promise.resolve(consume(null, data));
        } else if (this.capacity && this.buffer.length < this.capacity) {
            this.buffer.push(data);
            return Promise.resolve(undefined);
        } else {
            return new Promise<void>(resolve => {
                this.producers.push(() => {
                    if (this.capacity) {
                        const _data = this.buffer.shift();
                        this.buffer.push(data);
                        resolve();
                        return _data as T;
                    } else {
                        resolve();
                        return data;
                    }
                });
            });
        }
    }

    /**
     * Retrieves data from the channel.
     * 
     * If there isn't data available at the moment, this function will block until new data is
     * available.
     * 
     * If the channel is closed, then:
     * 
     * - If there is error set in the channel, this function throws that error immediately.
     * - Otherwise, this function returns `undefined` immediately.
     */
    pop(): Promise<T | void> {
        if (this.buffer.length) {
            const data = this.buffer.shift();

            if (this.state === 2 && !this.buffer.length) {
                this.state = 0;
            }

            return Promise.resolve(data);
        } else if (this.producers.length) {
            const produce = this.producers.shift() as () => T;

            if (this.state === 2 && !this.producers.length) {
                this.state = 0;
            }

            return Promise.resolve(produce());
        } else if (this.state === 0) {
            return Promise.resolve(undefined);
        } else if (this.error) {
            // Error can only be consumed once, after that, that closure will be complete.
            const { error } = this;
            this.state = 0;
            this.error = null;
            return Promise.reject(error);
        } else if (this.state === 2) {
            this.state = 0;
            return Promise.resolve(undefined);
        } else {
            return new Promise<T>((resolve, reject) => {
                this.consumers.push((err: unknown, data?: T) => {
                    if (this.state === 2 && !this.consumers.length) {
                        this.state = 0;
                    }

                    err ? reject(err) : resolve(data as T);
                });
            });
        }
    }

    /**
     * Closes the channel. If `err` is supplied, it will be captured by the receiver.
     * 
     * No more data shall be sent once the channel is closed.
     * 
     * Explicitly closing the channel is not required, if the channel is no longer used, it
     * will be automatically released by the GC. However, if the channel is used in a
     * `for await...of...` loop, closing the channel will allow the loop to break automatically.
     * 
     * Moreover, if the channel is used between parallel threads, it will no longer be able to
     * release automatically, must explicitly call this function in order to release for GC.
     */
    close(err: Error | null = null) {
        if (this.state !== 1) {
            // prevent duplicated call
            return;
        }

        this.state = 2;
        this.error = err;
        let consume: ((err: Error | null, data?: T) => void) | undefined;

        while (consume = this.consumers.shift()) {
            consume(err, undefined);
        }
    }

    [Symbol.asyncIterator]() {
        const channel = this;
        return {
            async next(): Promise<IteratorResult<T>> {
                const bufSize = channel.buffer.length;
                const queueSize = channel.producers.length;
                const value = await channel.pop();
                return {
                    value: value as T,
                    done: channel.state === 0 && !bufSize && !queueSize,
                };
            }
        };
    }
}

/**
 * Inspired by Golang, cerates a channel that can be used to transfer data within the program.
 * 
 * If `capacity` is not set, a non-buffered channel will be created. For a non-buffered channel,
 * the sender and receiver must be present at the same time (theoretically), otherwise, the
 * channel will block (non-IO aspect).
 * 
 * If `capacity` is set, a buffered channel will be created. For a buffered channel, data will
 * be queued in the buffer first and then consumed by the receiver in FIFO order. Once the
 * buffer size reaches the capacity limit, no more data will be sent unless there is new space
 * available.
 * 
 * It is possible to set the `capacity` to `Infinity` to allow the channel to never block and
 * behave like a message queue.
 * 
 * Unlike `EventEmitter` or `EventTarget`, `Channel` guarantees the data will always be delivered,
 * even if there is no receiver at the moment.
 * 
 * Also, unlike Golang, `await channel.pop()` does not prevent the process from exiting.
 * 
 * Channel can be used to send and receive streaming data in worker threads, but once it has been
 * used that way, `channel.close()` must be explicitly called in order to release the channel for
 * garbage collection.
 * 
 * @example
 * ```ts
 * const channel = chan<number>();
 * 
 * (async () => {
 *     await channel.push(123);
 * })();
 * 
 * const num = await channel.pop();
 * console.log(num);
 * // output:
 * // 123
 * ```
 * 
 * @example
 * ```ts
 * const channel = chan<number>(3);
 * 
 * await channel.push(123);
 * await channel.push(456);
 * await channel.push(789);
 * 
 * const num1 = await channel.pop();
 * const num2 = await channel.pop();
 * const num3 = await channel.pop();
 * 
 * console.log(num1);
 * console.log(num2);
 * console.log(num3);
 * // output:
 * // 123
 * // 456
 * // 789
 * ```
 * 
 * @example
 * ```ts
 * const channel = chan<number>();
 * 
 * (async () => {
 *     for (const num of Number.sequence(1, 5)) {
 *         await channel.push(num);
 *     }
 * 
 *     channel.close();
 * })();
 * 
 * for await (const num of channel) {
 *     console.log(num);
 * }
 * // output:
 * // 1
 * // 2
 * // 3
 * // 4
 * // 5
 * ```
 */
export default function chan<T>(capacity = 0): Channel<T> {
    return new Channel<T>(capacity);
}
