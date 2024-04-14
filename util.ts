export function isFunction(val: unknown): val is (...args: any[]) => any {
    return typeof val === "function";
}

export function isPath(id: string): boolean {
    return /^(\.[\/\\]|\.\.[\/\\]|[a-zA-Z]:|\/)/.test(id);
}

export function unrefTimer(timer: NodeJS.Timeout | number): void {
    if (typeof timer === "object" && typeof timer.unref === "function") {
        timer.unref();
    } else if (typeof Deno === "object" && typeof Deno.unrefTimer === "function") {
        Deno.unrefTimer(timer as number);
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
export function asIterable(source: any): AsyncIterable<any> | null {
    if (isFunction(source[Symbol.asyncIterator])) {
        return source;
    } else if (typeof ReadableStream === "function"
        && source instanceof ReadableStream
    ) {
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
                } finally {
                    reader.releaseLock();
                }
            },
        };
    }

    return null;
}
