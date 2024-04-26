/**
 * Make the timer of the given `id` not block the event loop from finishing.
 *
 * Only available in Node.js/Bun and Deno, in the browser, this function is a
 * no-op.
 */
function unrefTimer(timer) {
    if (typeof timer === "object" && typeof timer.unref === "function") {
        timer.unref();
    }
    else if (typeof timer === "number"
        && typeof Deno === "object"
        && typeof Deno.unrefTimer === "function") {
        Deno.unrefTimer(timer);
    }
}
/**
 * Converts the given `source` into an `AsyncIterable` object if it's not one
 * already, returns `null` if failed.
 */
function asAsyncIterable(source) {
    if (typeof source[Symbol.asyncIterator] === "function") {
        return source;
    }
    else if (typeof source[Symbol.iterator] === "function") {
        return {
            [Symbol.asyncIterator]: async function* () {
                for (const value of source) {
                    yield value;
                }
            },
        };
    }
    else if (typeof ReadableStream === "function"
        && source instanceof ReadableStream) {
        const reader = source.getReader();
        return {
            [Symbol.asyncIterator]: async function* () {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            break;
                        }
                        yield value;
                    }
                }
                finally {
                    reader.releaseLock();
                }
            },
        };
    }
    return null;
}

export { asAsyncIterable, unrefTimer };
//# sourceMappingURL=util.js.map
