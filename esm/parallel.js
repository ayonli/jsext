import { ThenableAsyncGenerator } from './external/thenable-generator/index.js';
import chan, { Channel } from './chan.js';
import { sequence } from './number/index.js';
import { trim } from './string/index.js';
import { isPlainObject } from './object/index.js';
import { fromErrorEvent, fromObject } from './error/index.js';
import { isNode, isBun, isDeno, wrapChannel, IsPath, isBeforeNode14, isMainThread, resolveModule, isChannelMessage, handleChannelMessage } from './util.js';

const taskIdCounter = sequence(1, Number.MAX_SAFE_INTEGER, 1, true);
const remoteTasks = new Map;
const workerIdCounter = sequence(1, Number.MAX_SAFE_INTEGER, 1, true);
let workerPool = [];
let gcTimer;
const getMaxParallelism = (async () => {
    if (isNode) {
        const os = await import('os');
        if (typeof os.availableParallelism === "function") {
            return os.availableParallelism();
        }
        else {
            return os.cpus().length;
        }
    }
    else if (typeof navigator === "object" && navigator.hardwareConcurrency) {
        return navigator.hardwareConcurrency;
    }
    else {
        return 8;
    }
})();
function sanitizeModuleId(id, strict = false) {
    let _id = "";
    if (typeof id === "function") {
        let str = id.toString();
        let start = str.lastIndexOf("(");
        if (start === -1) {
            throw new TypeError("the given script is not a dynamic import expression");
        }
        else {
            start += 1;
            const end = str.indexOf(")", start);
            _id = trim(str.slice(start, end), ` '"\'`);
        }
    }
    else {
        _id = id;
    }
    if (isNode &&
        !/\.[cm]?(js|ts|)x?$/.test(_id) && // omit suffix
        IsPath.test(_id) // relative or absolute path
    ) {
        if (isBun) {
            _id += ".ts";
        }
        else {
            _id += ".js";
        }
    }
    if (!IsPath.test(_id) && !strict) {
        _id = "./" + _id;
    }
    return _id;
}
function isCallResponse(msg) {
    return msg && typeof msg === "object" && ["return", "yield", "error", "gen"].includes(msg.type);
}
async function createWorker(options = {}) {
    var _a;
    let { adapter = "worker_threads" } = options;
    let entry = parallel.workerEntry;
    if (isNode || isBun) {
        if (!entry) {
            const path = await import('path');
            const { fileURLToPath } = await import('url');
            const _filename = fileURLToPath(import.meta.url);
            if (_filename === process.argv[1]) {
                // The code is bundled, try the worker entry in node_modules (hope it exists).
                if (isBun) {
                    entry = "./node_modules/@ayonli/jsext/worker.ts";
                }
                else {
                    entry = "./node_modules/@ayonli/jsext/bundle/worker-node.mjs";
                }
            }
            else {
                let _dirname = path.dirname(_filename);
                if ([
                    path.join("jsext", "cjs"),
                    path.join("jsext", "esm"),
                    path.join("jsext", "bundle")
                ].some(path => _dirname.endsWith(path))) {
                    // The application imports the compiled version of this module,
                    // redirect to the root directory of this package.
                    _dirname = path.dirname(_dirname);
                }
                if (isBun) {
                    entry = path.join(_dirname, "worker.ts");
                }
                else {
                    entry = path.join(_dirname, "bundle", "worker-node.mjs");
                }
            }
        }
        if (adapter === "child_process") {
            const { fork } = await import('child_process');
            const serialization = isBeforeNode14 ? "json" : "advanced";
            const worker = fork(entry, ["--worker-thread", "--serialization=" + serialization], {
                stdio: "inherit",
                serialization,
            });
            const workerId = worker.pid;
            await new Promise((resolve, reject) => {
                worker.once("error", reject);
                worker.once("message", () => {
                    worker.off("error", reject);
                    resolve();
                });
            });
            return {
                worker,
                workerId,
                kind: "node_process",
            };
        }
        else if (isNode) {
            const { Worker } = await import('worker_threads');
            const worker = new Worker(entry, { argv: ["--worker-thread"] });
            const workerId = worker.threadId;
            await new Promise((resolve, reject) => {
                worker.once("error", reject);
                worker.once("online", () => {
                    worker.off("error", reject);
                    resolve();
                });
            });
            return {
                worker,
                workerId,
                kind: "node_worker",
            };
        }
        else { // isBun
            const worker = new Worker(entry, { type: "module" });
            const workerId = workerIdCounter.next().value;
            await new Promise((resolve, reject) => {
                worker.onerror = (ev) => {
                    reject(new Error(ev.message || "unable to start the worker"));
                };
                worker.addEventListener("open", () => {
                    worker.onerror = null;
                    resolve();
                });
            });
            return {
                worker,
                workerId,
                kind: "bun_worker",
            };
        }
    }
    else { // Deno and browsers
        if (isDeno) {
            if (!entry) {
                if (import.meta["main"]) {
                    // The code is bundled, try the remote worker entry.
                    entry = "https://ayonli.github.io/jsext/bundle/worker.mjs";
                }
                else {
                    entry = [
                        ...(import.meta.url.split("/").slice(0, -1)),
                        "worker.ts"
                    ].join("/");
                    // The application imports the compiled version of this module,
                    // redirect to the source worker entry.
                    if (entry.endsWith("/esm/worker.ts")) {
                        entry = entry.slice(0, -14) + "/worker.ts";
                    }
                }
            }
        }
        else {
            // Use fetch to download the script and compose an object URL can bypass CORS
            // security constraint in the browser.
            const url = entry || "https://ayonli.github.io/jsext/bundle/worker.mjs";
            const res = await fetch(url);
            let blob;
            if ((_a = res.headers.get("content-type")) === null || _a === void 0 ? void 0 : _a.includes("/javascript")) {
                blob = await res.blob();
            }
            else {
                const buf = await res.arrayBuffer();
                blob = new Blob([new Uint8Array(buf)], {
                    type: "application/javascript",
                });
            }
            entry = URL.createObjectURL(blob);
        }
        const worker = new Worker(entry, { type: "module" });
        const workerId = workerIdCounter.next().value;
        return {
            worker,
            workerId,
            kind: "web_worker",
        };
    }
}
async function acquireWorker(taskId) {
    const maxWorkers = parallel.maxWorkers || await getMaxParallelism;
    let poolRecord = workerPool.find(item => !item.tasks.size);
    if (poolRecord) {
        poolRecord.lastAccess = Date.now();
    }
    else if (workerPool.length < maxWorkers) {
        workerPool.push(poolRecord = {
            getWorker: (async () => {
                const worker = (await createWorker()).worker;
                const handleMessage = (msg) => {
                    var _a, _b, _c, _d;
                    if (isChannelMessage(msg)) {
                        handleChannelMessage(msg);
                    }
                    else if (isCallResponse(msg) && msg.taskId) {
                        const task = remoteTasks.get(msg.taskId);
                        if (!task)
                            return;
                        if (msg.type === "return" || msg.type === "error") {
                            if (msg.type === "error") {
                                const err = isPlainObject(msg.error)
                                    ? ((_a = fromObject(msg.error)) !== null && _a !== void 0 ? _a : msg.error)
                                    : msg.error;
                                if (err instanceof Error &&
                                    (err.message.includes("not be cloned")
                                        || ((_b = err.stack) === null || _b === void 0 ? void 0 : _b.includes("not be cloned")) // Node.js v16-
                                    )) {
                                    Object.defineProperty(err, "stack", {
                                        configurable: true,
                                        enumerable: false,
                                        writable: true,
                                        value: (err.stack ? err.stack + "\n    " : "")
                                            + `at ${task.fn} (${task.module})`,
                                    });
                                }
                                if (task.resolver) {
                                    task.resolver.reject(err);
                                    if (task.channel) {
                                        task.channel.close();
                                    }
                                }
                                else if (task.channel) {
                                    task.channel.close(err);
                                }
                                else {
                                    task.error = err;
                                }
                            }
                            else {
                                if (task.resolver) {
                                    task.resolver.resolve(msg.value);
                                }
                                else {
                                    task.result = { value: msg.value };
                                }
                                if (task.channel) {
                                    task.channel.close();
                                }
                            }
                            poolRecord.tasks.delete(msg.taskId);
                            if (!poolRecord.tasks.size && (isNode || isBun)) {
                                // Allow the main thread to exit if the event loop is empty.
                                worker.unref();
                            }
                        }
                        else if (msg.type === "yield") {
                            (_c = task.channel) === null || _c === void 0 ? void 0 : _c.push({ value: msg.value, done: msg.done });
                            if (msg.done) {
                                // The final message of yield event is the return value.
                                handleMessage({
                                    type: "return",
                                    value: msg.value,
                                    taskId: msg.taskId,
                                });
                            }
                        }
                        else if (msg.type === "gen") {
                            (_d = task.generate) === null || _d === void 0 ? void 0 : _d.call(task);
                        }
                    }
                };
                const handleClose = (err) => {
                    for (const taskId of poolRecord.tasks) {
                        poolRecord.tasks.delete(taskId);
                        const task = remoteTasks.get(taskId);
                        if (task) {
                            if (task.resolver) {
                                task.resolver.reject(err);
                                if (task.channel) {
                                    task.channel.close();
                                }
                            }
                            else if (task.channel) {
                                task.channel.close(err);
                            }
                            else {
                                task.error = err;
                            }
                        }
                    }
                    workerPool = workerPool.filter(item => item !== poolRecord);
                };
                if (isNode) {
                    worker.on("message", handleMessage)
                        .on("error", handleClose); // In Node.js, worker will exit once erred.
                }
                else if (isBun) {
                    const _worker = worker;
                    _worker.onmessage = (ev) => handleMessage(ev.data);
                    _worker.onerror = () => _worker.terminate(); // terminate once erred
                    _worker.addEventListener("close", ((ev) => {
                        handleClose(new Error(ev.reason + " (" + ev.code + ")"));
                    }));
                }
                else {
                    const _worker = worker;
                    _worker.onmessage = (ev) => handleMessage(ev.data);
                    _worker.onerror = (ev) => {
                        var _a;
                        _worker.terminate(); // ensure termination
                        handleClose((_a = fromErrorEvent(ev)) !== null && _a !== void 0 ? _a : new Error("worker exited"));
                    };
                }
                return worker;
            })(),
            tasks: new Set(),
            lastAccess: Date.now(),
        });
        if (!gcTimer) {
            gcTimer = setInterval(() => {
                // GC: clean long-time unused workers
                const now = Date.now();
                const idealItems = [];
                workerPool = workerPool.filter(item => {
                    const ideal = !item.tasks.size
                        && (now - item.lastAccess) >= 10000;
                    if (ideal) {
                        idealItems.push(item);
                    }
                    return !ideal;
                });
                idealItems.forEach(async (item) => {
                    const worker = await item.getWorker;
                    await worker.terminate();
                });
            }, 1000);
            if (isNode || isBun) {
                gcTimer.unref();
            }
            else if (isDeno) {
                Deno.unrefTimer(gcTimer);
            }
        }
    }
    else {
        poolRecord = workerPool[taskId % workerPool.length];
        poolRecord.lastAccess = Date.now();
    }
    poolRecord.tasks.add(taskId);
    const worker = await poolRecord.getWorker;
    if (isNode || isBun) {
        // Prevent premature exit in the main thread.
        worker.ref();
    }
    return worker;
}
function wrapArgs(args, getWorker) {
    const transferable = [];
    args = args.map(arg => {
        if (arg instanceof Channel) {
            return wrapChannel(arg, (type, msg, channelId) => {
                getWorker.then(worker => {
                    if (typeof worker["postMessage"] === "function") {
                        try {
                            worker.postMessage({
                                type,
                                value: msg,
                                channelId,
                            });
                        }
                        catch (err) {
                            // Suppress error when sending `close` command to the channel in the
                            // worker thread when the thread is terminated. This situation often
                            // occurs when using `run()` to call function and the `result()` is
                            // is called before `channel.close()`.
                            if (!(type === "close" &&
                                String(err).includes("Worker has been terminated"))) {
                                throw err;
                            }
                        }
                    }
                    else {
                        worker.send({
                            type,
                            value: msg,
                            channelId,
                        });
                    }
                });
            });
        }
        if (arg instanceof ArrayBuffer) {
            transferable.push(arg);
        }
        else if (isPlainObject(arg)) {
            for (const key of Object.getOwnPropertyNames(arg)) {
                const value = arg[key];
                if (value instanceof ArrayBuffer) {
                    transferable.push(value);
                }
            }
        }
        return arg;
    });
    return { args, transferable };
}
async function safeRemoteCall(worker, req, transferable, taskId) {
    try {
        worker.postMessage(req, transferable);
    }
    catch (err) {
        remoteTasks.delete(taskId);
        if (typeof worker["unref"] === "function") {
            worker.unref();
        }
        throw err;
    }
}
function createRemoteCall(module, fn, args) {
    const taskId = taskIdCounter.next().value;
    remoteTasks.set(taskId, { module, fn });
    let getWorker = acquireWorker(taskId);
    const { args: _args, transferable } = wrapArgs(args, getWorker);
    getWorker = getWorker.then(async (worker) => {
        await safeRemoteCall(worker, {
            type: "call",
            module,
            fn,
            args: _args,
            taskId,
        }, transferable, taskId);
        return worker;
    });
    return new ThenableAsyncGenerator({
        then(onfulfilled, onrejected) {
            const task = remoteTasks.get(taskId);
            if (task.error) {
                remoteTasks.delete(taskId);
                return onrejected === null || onrejected === void 0 ? void 0 : onrejected(task.error);
            }
            else if (task.result) {
                remoteTasks.delete(taskId);
                return onfulfilled === null || onfulfilled === void 0 ? void 0 : onfulfilled(task.result.value);
            }
            else {
                return getWorker.then(() => new Promise((resolve, reject) => {
                    task.resolver = {
                        resolve: (value) => {
                            remoteTasks.delete(taskId);
                            resolve(value);
                        },
                        reject: (err) => {
                            remoteTasks.delete(taskId);
                            reject(err);
                        }
                    };
                })).then(onfulfilled, onrejected);
            }
        },
        async next(input) {
            var _a;
            const task = remoteTasks.get(taskId);
            if (task.error) {
                const err = task.error;
                remoteTasks.delete(taskId);
                throw err;
            }
            else if (task.result) {
                const value = task.result.value;
                remoteTasks.delete(taskId);
                return { value, done: true };
            }
            else {
                (_a = task.channel) !== null && _a !== void 0 ? _a : (task.channel = chan(Infinity));
                const worker = await getWorker;
                if (!task.generate) {
                    await new Promise(resolve => {
                        task.generate = resolve;
                    });
                }
                const { args, transferable } = wrapArgs([input], getWorker);
                await safeRemoteCall(worker, {
                    type: "next",
                    args: args,
                    taskId,
                }, transferable, taskId);
                return await task.channel.pop();
            }
        },
        async return(value) {
            remoteTasks.delete(taskId);
            const worker = await getWorker;
            const { args, transferable } = wrapArgs([value], getWorker);
            await safeRemoteCall(worker, {
                type: "return",
                args: args,
                taskId,
            }, transferable, taskId);
            return { value, done: true };
        },
        async throw(err) {
            remoteTasks.delete(taskId);
            const worker = await getWorker;
            await safeRemoteCall(worker, {
                type: "throw",
                args: [err],
                taskId,
            }, transferable, taskId);
            throw err;
        },
    });
}
function createLocalCall(module, fn, args) {
    const getReturns = resolveModule(module).then(mod => {
        return mod[fn](...args);
    });
    return new ThenableAsyncGenerator({
        then(onfulfilled, onrejected) {
            return getReturns.then(onfulfilled, onrejected);
        },
        async next(input) {
            const gen = await getReturns;
            return await gen.next(input);
        },
        async return(value) {
            const gen = await getReturns;
            return await gen.return(value);
        },
        async throw(err) {
            const gen = await getReturns;
            return gen.throw(err);
        },
    });
}
function extractBaseUrl(stackTrace) {
    var _a, _b, _c;
    const lines = stackTrace.split("\n");
    let callSite;
    if ((_a = lines[0]) === null || _a === void 0 ? void 0 : _a.startsWith("Error")) { // chromium browsers
        callSite = lines[2];
    }
    else {
        callSite = lines[1];
    }
    let baseUrl;
    if (callSite) {
        let start = callSite.lastIndexOf("(");
        let end = 0;
        if (start !== -1) {
            start += 1;
            end = callSite.indexOf(")", start);
            callSite = callSite.slice(start, end);
        }
        else if (callSite.startsWith("    at ")) {
            callSite = callSite.slice(7); // remove leading `    at `
        }
        else if (typeof location === "object") { // general browsers
            start = (_c = (_b = callSite.match(/(https?|file):/)) === null || _b === void 0 ? void 0 : _b.index) !== null && _c !== void 0 ? _c : -1;
            if (start > 0) {
                callSite = callSite.slice(start);
            }
        }
        baseUrl = callSite.replace(/:\d+:\d+$/, "");
        if (!/^(https?|file):/.test(baseUrl)) {
            baseUrl = "file://" + baseUrl;
        }
    }
    return baseUrl;
}
/**
 * Wraps a module so its functions are run in worker threads.
 *
 * In Node.js and Bun, the `module` can be either an ES module or a CommonJS module,
 * **node_modules** and built-in modules are also supported.
 *
 * In browsers and Deno, the `module` can only be an ES module.
 *
 * In Bun and Deno, the `module` can also be a TypeScript file.
 *
 * Data are cloned and transferred between threads via **Structured Clone Algorithm**.
 *
 * Apart from the standard data types supported by the algorithm, {@link Channel} can also be
 * used to transfer data between threads. To do so, just passed a channel instance to the threaded
 * function. But be aware, channel can only be used as a parameter, return a channel from the
 * threaded function is not allowed. Once passed, the data can only be transferred into and
 * out-from the function.
 *
 * The difference between using a channel and a generator function for streaming processing is, for
 * a generator function, `next(value)` is coupled with a `yield value`, the process is blocked
 * between **next** calls, channel doesn't have this limit, we can use it to stream all the data
 * into the function before processing and receiving any result.
 *
 * The threaded function also supports `ArrayBuffer`s as transferable objects. If an array buffer is
 * presented as an argument or the direct property of an argument (assume it's a plain object), or
 * the array buffer is the return value or the direct property of the return value (assume it's a
 * plain object), it automatically becomes a transferrable object and will be transferred to the
 * other thread instead of being cloned. This strategy allows us to easily compose objects like
 * `Request` and `Response` instances into plain objects and pass them between threads without
 * overhead.
 *
 * NOTE: if the current module is already in a worker thread, use this function won't create another
 * worker thread.
 *
 * NOTE: cloning and transferring data between the main thread and worker threads are very heavy
 * and slow, worker threads are only intended to run CPU-intensive tasks and prevent blocking the
 * main thread, they have no advantage when performing IO-intensive tasks such as handling HTTP
 * requests, always prefer `cluster` module for that kind of purpose.
 *
 * @example
 * ```ts
 * // regular or async function
 * const mod = parallel(() => import("./examples/worker.mjs"));
 * console.log(await mod.greet("World")); // Hi, World
 * ```
 *
 * @example
 * ```ts
 * // generator or async generator function
 * const mod = parallel(() => import("./examples/worker.mjs"));
 *
 * for await (const word of mod.sequence(["foo", "bar"])) {
 *     console.log(word);
 * }
 * // output:
 * // foo
 * // bar
 * ```
 *
 * @example
 * ```ts
 * // use channel
 * const mod = parallel(() => import("./examples/worker.mjs"));
 *
 * const channel = chan<{ value: number; done: boolean; }>();
 * const length = mod.twoTimesValues(channel);
 *
 * for (const value of Number.sequence(0, 9)) {
 *     await channel.push({ value, done: value === 9 });
 * }
 *
 * const results = (await readAll(channel)).map(item => item.value);
 * console.log(results);      // [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]
 * console.log(await length); // 10
 * ```
 *
 * @example
 * ```ts
 * // use transferrable
 * const mod = parallel(() => import("./examples/worker.mjs"));
 *
 * const arr = Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
 * const length = await mod.transfer(arr.buffer);
 *
 * console.log(length);     // 10
 * console.log(arr.length); // 0
 * ```
 *
 * NOTE: if the application is to be bundled, use the following syntax to link the module instead,
 * it will prevent the bundler from including the file and rewriting the path.
 *
 * ```ts
 * const mod = parallel<typeof import("./examples/worker.mjs")>("./examples/worker.mjs");
 * ```
 */
function parallel(module) {
    let modId = sanitizeModuleId(module, true);
    let baseUrl;
    if (IsPath.test(modId)) {
        if (typeof Error.captureStackTrace === "function") {
            const trace = {};
            Error.captureStackTrace(trace);
            baseUrl = extractBaseUrl(trace.stack);
        }
        else {
            const trace = new Error("");
            baseUrl = extractBaseUrl(trace.stack);
        }
    }
    if (baseUrl) {
        modId = new URL(modId, baseUrl).href;
    }
    return new Proxy(Object.create(null), {
        get: (target, prop) => {
            if (Reflect.has(target, prop)) {
                return target[prop];
            }
            else if (typeof prop === "symbol") {
                return undefined;
            }
            const obj = {
                // This syntax will give our remote function a name.
                [prop]: (...args) => {
                    if (isMainThread) {
                        return createRemoteCall(modId, prop, args);
                    }
                    else {
                        return createLocalCall(modId, prop, args);
                    }
                }
            };
            return obj[prop];
        }
    });
}
(function (parallel) {
    /**
     * The maximum number of workers allowed to exist at the same time. If not set, the program
     * by default uses CPU core numbers as the limit.
     */
    parallel.maxWorkers = undefined;
    /**
     * In browsers, by default, the program loads the worker entry directly from GitHub,
     * which could be slow due to poor internet connection, we can copy the entry file
     * `bundle/worker.mjs` to a local path of our website and set this option to that path
     * so that it can be loaded locally.
     *
     * Or, if the code is bundled, the program won't be able to automatically locate the entry
     * file in the file system, in such case, we can also copy the entry file
     * (`bundle/worker.mjs` for Bun, Deno and the browser, `bundle/worker-node.mjs` for Node.js)
     * to a local directory and supply this option instead.
     */
    parallel.workerEntry = undefined;
})(parallel || (parallel = {}));
var parallel$1 = parallel;

export { createWorker, parallel$1 as default, getMaxParallelism, isCallResponse, sanitizeModuleId, wrapArgs };
//# sourceMappingURL=parallel.js.map
