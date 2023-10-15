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
 * Returns `true` if the specified object has the indicated property as its own property.
 * If the property is inherited, or does not exist, the function returns `false`.
 */
function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}
function pick(obj, keys) {
    return keys.reduce((result, key) => {
        if (key in obj && obj[key] !== undefined) {
            result[key] = obj[key];
        }
        return result;
    }, {});
}
function omit(obj, keys) {
    const allKeys = Reflect.ownKeys(obj);
    const keptKeys = allKeys.filter(key => !keys.includes(key));
    const result = pick(obj, keptKeys);
    // special treatment for Error types
    if (obj instanceof Error) {
        ["name", "message", "cause"].forEach(key => {
            if (!keys.includes(key) &&
                obj[key] !== undefined &&
                !hasOwn(result, key)) {
                result[key] = obj[key];
            }
        });
    }
    return result;
}

/** Transform the error to a plain object. */
function toObject(err) {
    return omit(err, []);
}

const isNode = typeof process === "object" && !!process.versions?.node;

/** @type {Map<string, any>} */
const moduleCache = new Map();

/** @type {Map<number, AsyncGenerator | Generator>} */
const pendingTasks = new Map();

/**
 * @param {any} msg
 * @returns {msg is import("./run.ts").FFIRequest}
 */
function isFFIRequest(msg) {
    return msg && typeof msg === "object" &&
        ["ffi", "next", "return", "throw"].includes(msg.type) &&
        typeof msg.script === "string" &&
        typeof msg.fn === "string" &&
        Array.isArray(msg.args);
}

/**
 * @param {import("./run.ts").FFIRequest} msg 
 * @param {(reply: import("./run.ts").FFIResponse) => void} reply
 */
async function handleMessage(msg, reply) {
    try {
        if (msg.taskId) {
            const task = pendingTasks.get(msg.taskId);

            if (task) {
                if (msg.type === "throw") {
                    try {
                        await task.throw(msg.args[0]);
                    } catch (err) {
                        reply({ type: "error", error: toObject(err), taskId: msg.taskId });
                    }
                } else if (msg.type === "return") {
                    try {
                        const res = await task.return(msg.args[0]);
                        reply({ type: "yield", ...res, taskId: msg.taskId });
                    } catch (err) {
                        reply({ type: "error", error: toObject(err), taskId: msg.taskId });
                    }
                } else if (msg.type === "next") {
                    try {
                        const res = await task.next(msg.args[0]);
                        reply({ type: "yield", ...res, taskId: msg.taskId });
                    } catch (err) {
                        reply({ type: "error", error: toObject(err), taskId: msg.taskId });
                    }
                }

                return;
            }
        }

        let module;

        if (isNode) {
            const path = await import('path');
            module = await import(msg.baseUrl ? path.resolve(msg.baseUrl, msg.script) : msg.script);
        } else {
            const url = new URL(msg.script, msg.baseUrl).href;
            module = moduleCache.get(url);

            if (!module) {
                if (typeof Deno === "object") {
                    module = await import(url);
                    moduleCache.set(url, module);
                } else {
                    try {
                        module = await import(url);
                        moduleCache.set(url, module);
                    } catch (err) {
                        if (String(err).includes("Failed")) {
                            // The content-type of the response isn't application/javascript, try to
                            // download it and load it with object URL.
                            const res = await fetch(url);
                            const buf = await res.arrayBuffer();
                            const blob = new Blob([new Uint8Array(buf)], {
                                type: "application/javascript",
                            });
                            const _url = URL.createObjectURL(blob);

                            module = await import(_url);
                            moduleCache.set(url, module);
                        } else {
                            throw err;
                        }
                    }
                }
            }
        }

        if (typeof module.default === "object" && typeof module.default.default === "function") {
            module = module.default; // CommonJS module
        }

        const returns = await module[msg.fn](...msg.args);

        if (isAsyncGenerator(returns) || isGenerator(returns)) {
            if (msg.taskId) {
                pendingTasks.set(msg.taskId, returns);
                reply({ type: "gen", taskId: msg.taskId });
            } else {
                while (true) {
                    try {
                        const { value, done } = await returns.next();
                        reply({ type: "yield", value, done });

                        if (done) {
                            break;
                        }
                    } catch (err) {
                        reply({ type: "error", error: toObject(err) });
                        break;
                    }
                }
            }
        } else {
            reply({ type: "return", value: returns, taskId: msg.taskId });
        }
    } catch (err) {
        reply({ type: "error", error: toObject(err), taskId: msg.taskId });
    }
}

if (typeof self === "object" && !isNode) {
    const reply = self.postMessage.bind(self);
    self.onmessage = async ({ data: msg }) => {
        if (isFFIRequest(msg)) {
            await handleMessage(msg, reply);
        }
    };
}

export { handleMessage, isFFIRequest };
