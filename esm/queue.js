import chan from './chan.js';

class Queue {
    constructor(handler, bufferSize = 0) {
        this.channel = chan(bufferSize);
        (async () => {
            var _a;
            for await (const data of this.channel) {
                try {
                    await handler.call(void 0, data);
                }
                catch (err) {
                    (_a = this.errorHandler) === null || _a === void 0 ? void 0 : _a.call(this, err);
                }
            }
        })().catch(err => {
            var _a;
            (_a = this.errorHandler) === null || _a === void 0 ? void 0 : _a.call(void 0, err);
        });
    }
    push(data) {
        return this.channel.push(data);
    }
    close() {
        var _a;
        (_a = this.channel) === null || _a === void 0 ? void 0 : _a.close();
    }
    onError(handler) {
        this.errorHandler = handler;
    }
}
/**
 * Processes data sequentially by the given `handler` function and prevents concurrency
 * conflicts, it returns a {@link Queue} instance that we can push data into.
 *
 * @param bufferSize The maximum capacity of the underlying channel, once reached, the push
 * operation will block until there is new space available. Bu default, this option is not set and
 * use a non-buffered channel instead.
 *
 * @example
 * ```ts
 * const list: string[] = [];
 * const q = queue(async (str: string) => {
 *     await Promise.resolve(null);
 *     list.push(str);
 * });
 *
 * q.onError(err => {
 *     console.error(err);
 * })
 *
 * await q.push("foo");
 * await q.push("foo");
 *
 * console.log(list.length);
 * q.close();
 * // output:
 * // 2
 * ```
 */
function queue(handler, bufferSize = 0) {
    return new Queue(handler, bufferSize);
}

export { Queue, queue as default };
//# sourceMappingURL=queue.js.map