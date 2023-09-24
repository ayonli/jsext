class Channel {
    constructor(capacity = 0) {
        this.buffer = [];
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
     * - If this is an non-buffered channel, this function will block until a receiver is
     *  available and the data is consumed.
     *
     * - If this is a buffered channel, then:
     *      - If the buffer size is within the capacity, the data will be pushed to the buffer.
     *      - Otherwise, this function will block until there is new space for the data in the
     *          buffer.
     */
    push(data) {
        if (this.state !== 1) {
            throw new Error("the channel is closed");
        }
        else if (this.sub) {
            return Promise.resolve(this.sub(null, data));
        }
        else if (this.capacity && this.buffer.length < this.capacity) {
            this.buffer.push(data);
            return Promise.resolve(undefined);
        }
        else {
            return new Promise(resolve => {
                this.pub = () => {
                    if (this.capacity) {
                        const _data = this.buffer.shift();
                        this.buffer.push(data);
                        this.pub = undefined;
                        resolve();
                        return _data;
                    }
                    else {
                        this.pub = undefined;
                        resolve();
                        return data;
                    }
                };
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
    pop() {
        if (this.buffer.length) {
            const data = this.buffer.shift();
            if (this.state === 2 && !this.buffer.length) {
                this.state = 0;
            }
            return Promise.resolve(data);
        }
        else if (this.pub) {
            this.state === 2 && (this.state = 0);
            return Promise.resolve(this.pub());
        }
        else if (this.state === 0) {
            return Promise.resolve(undefined);
        }
        else if (this.error) {
            // Error can only be consumed once, after that, that closure will be complete.
            const { error } = this;
            this.state = 0;
            this.error = undefined;
            return Promise.reject(error);
        }
        else if (this.state === 2) {
            this.state = 0;
            return Promise.resolve(undefined);
        }
        else {
            return new Promise((resolve, reject) => {
                this.sub = (err, data) => {
                    this.state === 2 && (this.state = 0);
                    this.sub = undefined;
                    err ? reject(err) : resolve(data);
                };
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
     */
    close(err = null) {
        var _a;
        this.state = 2;
        this.error = err;
        (_a = this.sub) === null || _a === void 0 ? void 0 : _a.call(this, err, undefined);
    }
    [Symbol.asyncIterator]() {
        const channel = this;
        return {
            async next() {
                const bufSize = channel.buffer.length;
                const value = await channel.pop();
                return { value: value, done: channel.state === 0 && !bufSize };
            }
        };
    }
}
/**
 * Inspired by Golang, cerates a channel that can be used to transfer data within the program.
 *
 * Unlike `EventEmitter` or `EventTarget`, `Channel` guarantees the data will always be delivered,
 * even if there is no receiver at the moment.
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
function chan(capacity = 0) {
    return new Channel(capacity);
}

export { Channel, chan as default };
//# sourceMappingURL=chan.js.map
