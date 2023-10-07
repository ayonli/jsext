import { resolve } from 'path';
import { isMainThread, parentPort } from 'worker_threads';

if (!Symbol.asyncIterator) {
    // @ts-ignore
    Symbol.asyncIterator = Symbol("Symbol.asyncIterator");
}

/**
 * Checks if the given object is an IteratorLike (implemented `next`).
 * @param {any} obj
 * @returns {obj is { [x: string | symbol]: any; next: Function }}
 */
function isIteratorLike(obj) {
    // An iterable object has a 'next' method, however including a 'next' method
    // doesn't ensure the object is an iterator, it is only iterator-like.
    return typeof obj === "object"
        && obj !== null
        && typeof obj.next === "function";
}

/**
 * Checks if the given object is an IterableIterator (implemented both
 * `@@iterator` and `next`).
 * @param {any} obj
 */
function isIterableIterator(obj) {
    return isIteratorLike(obj)
        && typeof obj[Symbol.iterator] === "function";
}

/**
 * Checks if the given object is an AsyncIterableIterator (implemented
 * both `@@asyncIterator` and `next`).
 * @param {any} obj
 * @returns {obj is AsyncIterableIterator<any>}
 */
function isAsyncIterableIterator(obj) {
    return isIteratorLike(obj)
        && typeof obj[Symbol.asyncIterator] === "function";
}

/**
 * Checks if the given object is a Generator.
 * @param {any} obj
 * @returns {obj is Generator}
 */
function isGenerator(obj) {
    return isIterableIterator(obj)
        && hasGeneratorSpecials(obj);
}

/**
 * Checks if the given object is an AsyncGenerator.
 * @param {any} obj
 * @returns {obj is AsyncGenerator}
 */
function isAsyncGenerator(obj) {
    return isAsyncIterableIterator(obj)
        && hasGeneratorSpecials(obj);
}

/**
 * @param {any} obj 
 */
function hasGeneratorSpecials(obj) {
    return typeof obj.return === "function"
        && typeof obj.throw === "function";
}

/**
 * @typedef {{type: string; script: string; baseUrl: string; fn: string; args: any[]}} FFIMessage
 */

/**
 * @param {any} msg
 * @returns {msg is FFIMessage}
 */
function isFFIMessage(msg) {
    return msg && typeof msg === "object" &&
        msg.type === "ffi" &&
        typeof msg.script === "string" &&
        typeof msg.fn === "string" &&
        Array.isArray(msg.args);
}

/**
 * @param {FFIMessage} msg 
 * @param {(reply: { type: string; value?: any; error?: unknown; done?: boolean | undefined }) => void} send
 */
async function handleMessage(msg, send) {
    try {
        let module = await import(resolve(process.cwd(), msg.script));

        if (typeof module.default === "object" && typeof module.default.default === "function") {
            module = module.default; // CommonJS module
        }

        const returns = await module[msg.fn](...msg.args);

        if (isAsyncGenerator(returns) || isGenerator(returns)) {
            while (true) {
                try {
                    const { value, done } = await returns.next();
                    send({ type: "yield", value, done });

                    if (done) {
                        break;
                    }
                } catch (err) {
                    send({ type: "error", error: err });
                    break;
                }
            }
        } else {
            send({ type: "return", value: returns });
        }
    } catch (error) {
        send({ type: "error", error });
    }
}

if (!isMainThread && parentPort) {
    const send = parentPort.postMessage.bind(parentPort);
    parentPort.on("message", async (msg) => {
        if (isFFIMessage(msg)) {
            await handleMessage(msg, send);
        }
    });
} else if (process.send) {
    const send = process.send.bind(process);
    send("ready"); // notify the parent process that the worker is ready;
    process.on("message", async (msg) => {
        if (isFFIMessage(msg)) {
            await handleMessage(msg, send);
        }
    });
}
