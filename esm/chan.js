import { serial } from './number.js';
import { id } from './env.js';

/**
 * A channel implementation that transfers data across routines, even across
 * multiple threads, inspired by Golang.
 * @module
 */
var _a;
if (typeof Symbol.dispose === "undefined") {
    Object.defineProperty(Symbol, "dispose", { value: Symbol("Symbol.dispose") });
}
const idGenerator = serial(true);
/**
 * A channel implementation that transfers data across routines, even across
 * multiple threads, inspired by Golang.
 */
class Channel {
    constructor(capacity = 0) {
        this[_a] = idGenerator.next().value;
        this.buffer = [];
        this.producers = [];
        this.consumers = [];
        this.error = null;
        this.state = 1;
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
     * - If this is an non-buffered channel, this function will block until a
     *  receiver is available and the data is consumed.
     *
     * - If this is a buffered channel, then:
     *      - If the buffer size is within the capacity, the data will be pushed
     *        to the buffer.
     *      - Otherwise, this function will block until there is new space for
     *        the data in the buffer.
     */
    send(data) {
        if (this.state !== 1) {
            throw new TypeError("the channel is closed");
        }
        else if (this.consumers.length) {
            const consume = this.consumers.shift();
            return Promise.resolve(consume(null, data));
        }
        else if (this.capacity && this.buffer.length < this.capacity) {
            this.buffer.push(data);
            return Promise.resolve(undefined);
        }
        else {
            return new Promise(resolve => {
                this.producers.push(() => {
                    if (this.capacity) {
                        const _data = this.buffer.shift();
                        this.buffer.push(data);
                        resolve();
                        return _data;
                    }
                    else {
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
     * If there isn't data available at the moment, this function will block
     * until new data is available.
     *
     * If the channel is closed, then:
     *
     * - If there is error set in the channel, this function throws that error
     *   immediately.
     * - Otherwise, this function returns `undefined` immediately.
     */
    recv() {
        if (this.buffer.length) {
            const data = this.buffer.shift();
            if (this.state === 2 && !this.buffer.length) {
                this.state = 0;
            }
            return Promise.resolve(data);
        }
        else if (this.producers.length) {
            const produce = this.producers.shift();
            if (this.state === 2 && !this.producers.length) {
                this.state = 0;
            }
            return Promise.resolve(produce());
        }
        else if (this.state === 0) {
            return Promise.resolve(undefined);
        }
        else if (this.error) {
            // Error can only be consumed once, after that, that closure will
            // be complete.
            const { error } = this;
            this.state = 0;
            this.error = null;
            return Promise.reject(error);
        }
        else if (this.state === 2) {
            this.state = 0;
            return Promise.resolve(undefined);
        }
        else {
            return new Promise((resolve, reject) => {
                this.consumers.push((err, data) => {
                    if (this.state === 2 && !this.consumers.length) {
                        this.state = 0;
                    }
                    err ? reject(err) : resolve(data);
                });
            });
        }
    }
    /**
     * Closes the channel. If `err` is supplied, it will be captured by the
     * receiver.
     *
     * No more data shall be sent once the channel is closed.
     *
     * Explicitly closing the channel is not required, if the channel is no
     * longer used, it will be automatically released by the GC. However, if
     * the channel is used in a `for await...of...` loop, closing the channel
     * will allow the loop to break automatically.
     *
     * Moreover, if the channel is used between parallel threads, it will no
     * longer be able to release automatically, must explicitly call this
     * function in order to release for GC.
     */
    close(err = null) {
        if (this.state !== 1) {
            // prevent duplicated call
            return;
        }
        this.state = 2;
        this.error = err;
        let consume;
        while (consume = this.consumers.shift()) {
            consume(err, undefined);
        }
    }
    [(_a = id, Symbol.asyncIterator)]() {
        const channel = this;
        return {
            async next() {
                const bufSize = channel.buffer.length;
                const queueSize = channel.producers.length;
                const value = await channel.recv();
                return {
                    value: value,
                    done: channel.state === 0 && !bufSize && !queueSize,
                };
            }
        };
    }
    [Symbol.dispose]() {
        this.close();
    }
}
/**
 * Inspired by Golang, cerates a {@link Channel} that can be used to transfer
 * data across routines.
 *
 * If `capacity` is not set, a non-buffered channel will be created. For a
 * non-buffered channel, the sender and receiver must be present at the same
 * time (theoretically), otherwise, the channel will block (non-IO aspect).
 *
 * If `capacity` is set, a buffered channel will be created. For a buffered
 * channel, data will be queued in the buffer first and then consumed by the
 * receiver in FIFO order. Once the buffer size reaches the capacity limit, no
 * more data will be sent unless there is new space available.
 *
 * It is possible to set the `capacity` to `Infinity` to allow the channel to
 * never block and behave like a message queue.
 *
 * Unlike `EventEmitter` or `EventTarget`, `Channel` guarantees the data will
 * always be delivered, even if there is no receiver at the moment.
 *
 * Also, unlike Golang, `await channel.recv()` does not prevent the program from
 * exiting.
 *
 * Channels can be used to send and receive streaming data between main thread
 * and worker threads wrapped by `parallel()`, but once used that way,
 * `channel.close()` must be explicitly called in order to release the channel
 * for garbage collection.
 *
 * @example
 * ```ts
 * // non-buffered
 * import chan from "@ayonli/jsext/chan";
 *
 * const channel = chan<number>();
 *
 * (async () => {
 *     await channel.send(123);
 * })();
 *
 * const num = await channel.recv();
 * console.log(num); // 123
 * // output:
 * // 123
 * ```
 *
 * @example
 * ```ts
 * // buffered
 * import chan from "@ayonli/jsext/chan";
 *
 * const channel = chan<number>(3);
 *
 * await channel.send(123);
 * await channel.send(456);
 * await channel.send(789);
 *
 * const num1 = await channel.recv();
 * const num2 = await channel.recv();
 * const num3 = await channel.recv();
 *
 * console.log(num1); // 123
 * console.log(num2); // 456
 * console.log(num3); // 789
 * ```
 *
 * @example
 * ```ts
 * // iterable
 * import chan from "@ayonli/jsext/chan";
 * import { range } from "@ayonli/jsext/number";
 *
 * const channel = chan<number>();
 *
 * (async () => {
 *     for (const num of range(1, 5)) {
 *         await channel.send(num);
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
function chan(capacity = 0) {
    return new Channel(capacity);
}

export { Channel, chan as default };
//# sourceMappingURL=chan.js.map
