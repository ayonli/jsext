function isFunction(val) {
    return typeof val === "function";
}
function unrefTimer(timer) {
    if (typeof timer === "object" && typeof timer.unref === "function") {
        timer.unref();
    }
    else if (typeof Deno === "object" && typeof Deno.unrefTimer === "function") {
        Deno.unrefTimer(timer);
    }
}
/**
 * If the input source is an iterable object, returns the iterable object.
 *
 * If the input source is a readable stream, returns an iterable object that
 * reads the stream.
 *
 * Otherwise, returns `null`.
 */
function asIterable(source) {
    if (isFunction(source[Symbol.asyncIterator])) {
        return source;
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

export { asIterable, isFunction, unrefTimer };
//# sourceMappingURL=util.js.map
