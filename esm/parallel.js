import { ThenableAsyncGenerator } from './external/thenable-generator/index.js';
import chan, { Channel } from './chan.js';
import { sequence } from './number/index.js';
import { trim } from './string/index.js';
import { fromObject } from './error/index.js';
import { isNode, isBun, isDeno, wrapChannel, isBeforeNode14, resolveModule, isChannelMessage, handleChannelMessage } from './util.js';

/**
 * The `[terminate]()` function of the threaded module should only be used for
 * testing purposes. When using `child_process` adapter, the program will not be able exit
 * automatically after the test because there is an active IPC channel between the parent and
 * the child process. Calling the terminate function will force to kill the child process and
 * allow the program to exit.
 */
const terminate = Symbol.for("terminate");
const shouldTransfer = Symbol.for("shouldTransfer");
const IsPath = /^(\.[\/\\]|\.\.[\/\\]|[a-zA-Z]:|\/)/;
// In Node.js, `process.argv` contains `--worker-thread` when the current thread is used as
// a worker. In Bun, this option only presents when using `child_process` adapter.
const isWorkerThread = (isNode || isBun) && process.argv.includes("--worker-thread");
const isMainThread = !isWorkerThread
    && (isBun ? Bun.isMainThread : typeof WorkerGlobalScope === "undefined");
const taskIdCounter = sequence(1, Number.MAX_SAFE_INTEGER, 1, true);
const tasks = new Map;
const workerIdCounter = sequence(1, Number.MAX_SAFE_INTEGER, 1, true);
const workerPools = new Map();
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
function createCallRequest(init) {
    const msg = { ...init, type: init.type || "call" };
    if (!msg.baseUrl) {
        if (isDeno) {
            msg.baseUrl = "file://" + Deno.cwd() + "/";
        }
        else if (isNode || isBun) {
            if (IsPath.test(msg.script)) {
                // Only set baseUrl for relative modules, don't set it for node modules.
                msg.baseUrl = "file://" + process.cwd() + "/";
            }
        }
        else if (typeof location === "object") {
            msg.baseUrl = location.href;
        }
    }
    return msg;
}
function isCallResponse(msg) {
    return msg && typeof msg === "object" && ["return", "yield", "error", "gen"].includes(msg.type);
}
async function createWorker(options) {
    var _a;
    let { entry, adapter, serialization } = options;
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
async function acquireWorker(taskId, options) {
    var _a;
    const maxWorkers = parallel.maxWorkers || await getMaxParallelism;
    const { adapter, serialization } = options;
    const poolKey = adapter + ":" + serialization;
    const workerPool = (_a = workerPools.get(poolKey)) !== null && _a !== void 0 ? _a : workerPools.set(poolKey, []).get(poolKey);
    let poolRecord = workerPool.find(item => !item.tasks.size);
    if (poolRecord) {
        poolRecord.lastAccess = Date.now();
    }
    else if (workerPool.length < maxWorkers) {
        workerPool.push(poolRecord = {
            getWorker: (async () => {
                const { worker } = await createWorker({
                    entry: parallel.workerEntry,
                    adapter,
                    serialization,
                });
                const handleMessage = (msg) => {
                    var _a, _b, _c, _d, _e;
                    if (isChannelMessage(msg)) {
                        handleChannelMessage(msg);
                    }
                    else if (isCallResponse(msg) && msg.taskId) {
                        const task = tasks.get(msg.taskId);
                        if (!task)
                            return;
                        if (msg.type === "return" || msg.type === "error") {
                            if (msg.type === "error") {
                                const err = ((_a = msg.error) === null || _a === void 0 ? void 0 : _a.constructor) === Object
                                    ? ((_b = fromObject(msg.error)) !== null && _b !== void 0 ? _b : msg.error)
                                    : msg.error;
                                if (err instanceof Error &&
                                    (err.name === "DOMException" || adapter === "child_process") &&
                                    (err.message.includes("not be cloned") ||
                                        err.message.includes("Do not know how to serialize"))) {
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
                            if (poolRecord) {
                                poolRecord.tasks.delete(msg.taskId);
                                if (!poolRecord.tasks.size) {
                                    if (isNode || isBun) {
                                        // Allow the main thread to exit if the event loop is empty.
                                        worker.unref();
                                    }
                                }
                                { // GC: clean long-time unused workers
                                    const now = Date.now();
                                    const idealItems = [];
                                    // The `workerPool` of this key in the pool map may have been
                                    // modified by other routines, we need to retrieve the newest
                                    // value.
                                    const remainItems = (_c = workerPools.get(poolKey)) === null || _c === void 0 ? void 0 : _c.filter(item => {
                                        const ideal = !item.tasks.size
                                            && (now - item.lastAccess) >= 300000;
                                        if (ideal) {
                                            idealItems.push(item);
                                        }
                                        return !ideal;
                                    });
                                    if (remainItems === null || remainItems === void 0 ? void 0 : remainItems.length) {
                                        workerPools.set(poolKey, remainItems);
                                    }
                                    else {
                                        workerPools.delete(poolKey);
                                    }
                                    idealItems.forEach(async (item) => {
                                        const worker = await item.getWorker;
                                        if (typeof worker["terminate"] === "function") {
                                            await worker.terminate();
                                        }
                                        else {
                                            worker.kill();
                                        }
                                    });
                                }
                            }
                        }
                        else if (msg.type === "yield") {
                            (_d = task.channel) === null || _d === void 0 ? void 0 : _d.push({ value: msg.value, done: msg.done });
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
                            (_e = task.generate) === null || _e === void 0 ? void 0 : _e.call(task);
                        }
                    }
                };
                if (isNode) {
                    worker.on("message", handleMessage);
                }
                else if (isBun) {
                    if (adapter === "child_process") {
                        worker.on("message", handleMessage);
                    }
                    else {
                        worker.onmessage = (ev) => handleMessage(ev.data);
                    }
                }
                else {
                    worker.onmessage = (ev) => handleMessage(ev.data);
                }
                return worker;
            })(),
            adapter,
            serialization,
            tasks: new Set(),
            lastAccess: Date.now(),
        });
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
        if (!arg || typeof arg !== "object" || Array.isArray(arg)) {
            return arg;
        }
        else if (arg instanceof Channel) {
            return wrapChannel(arg, (type, msg, channelId) => {
                getWorker.then(worker => {
                    if (typeof worker["postMessage"] === "function") {
                        worker.postMessage({
                            type,
                            value: msg,
                            channelId,
                        });
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
        else if (arg[shouldTransfer]) {
            transferable.push(arg);
            return arg;
        }
        else {
            return arg;
        }
    });
    return { args, transferable };
}
async function safeRemoteCall(worker, req, transferable = [], taskId = 0) {
    try {
        if (typeof worker["postMessage"] === "function") {
            worker.postMessage(req, transferable);
        }
        else {
            await new Promise((resolve, reject) => {
                worker.send(req, err => err ? reject(err) : resolve());
            });
        }
    }
    catch (err) {
        taskId && tasks.delete(taskId);
        if (typeof worker["unref"] === "function") {
            worker.unref();
        }
        throw err;
    }
}
function createRemoteCall(modId, fn, args, baseUrl = undefined, options) {
    const taskId = taskIdCounter.next().value;
    tasks.set(taskId, { module: baseUrl ? new URL(modId, baseUrl).href : modId, fn });
    let getWorker = acquireWorker(taskId, options);
    const { args: _args, transferable } = wrapArgs(args, getWorker);
    getWorker = getWorker.then(async (worker) => {
        const req = createCallRequest({
            script: modId,
            fn,
            args: _args,
            taskId,
            baseUrl: baseUrl
        });
        await safeRemoteCall(worker, req, transferable, taskId);
        return worker;
    });
    return new ThenableAsyncGenerator({
        then(onfulfilled, onrejected) {
            const task = tasks.get(taskId);
            if (task.error) {
                tasks.delete(taskId);
                return onrejected === null || onrejected === void 0 ? void 0 : onrejected(task.error);
            }
            else if (task.result) {
                tasks.delete(taskId);
                return onfulfilled === null || onfulfilled === void 0 ? void 0 : onfulfilled(task.result.value);
            }
            else {
                return getWorker.then(() => new Promise((resolve, reject) => {
                    task.resolver = {
                        resolve: (value) => {
                            tasks.delete(taskId);
                            resolve(value);
                        },
                        reject: (err) => {
                            tasks.delete(taskId);
                            reject(err);
                        }
                    };
                })).then(onfulfilled, onrejected);
            }
        },
        async next(input) {
            var _a;
            const task = tasks.get(taskId);
            if (task.error) {
                const err = task.error;
                tasks.delete(taskId);
                throw err;
            }
            else if (task.result) {
                const value = task.result.value;
                tasks.delete(taskId);
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
                const req = createCallRequest({
                    script: modId,
                    fn,
                    args: args,
                    taskId,
                    type: "next",
                    baseUrl: baseUrl,
                });
                await safeRemoteCall(worker, req, transferable, taskId);
                return await task.channel.pop();
            }
        },
        async return(value) {
            tasks.delete(taskId);
            const worker = await getWorker;
            const { args, transferable } = wrapArgs([value], getWorker);
            const req = createCallRequest({
                script: modId,
                fn,
                args: args,
                taskId,
                type: "return",
                baseUrl: baseUrl,
            });
            await safeRemoteCall(worker, req, transferable, taskId);
            return { value, done: true };
        },
        async throw(err) {
            tasks.delete(taskId);
            const worker = await getWorker;
            const req = createCallRequest({
                script: modId,
                fn,
                args: [err],
                taskId,
                type: "throw",
                baseUrl: baseUrl,
            });
            await safeRemoteCall(worker, req, transferable, taskId);
            throw err;
        },
    });
}
function createLocalCall(modId, fn, args, baseUrl = undefined) {
    const getReturns = resolveModule(modId, baseUrl).then(module => {
        return module[fn](...args);
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
 * Wraps a module and run its functions in worker threads.
 *
 * In Node.js and Bun, the `module` can be either an ES module or a CommonJS module,
 * **node_modules** and built-in modules are also supported.
 *
 * In browsers and Deno, the `module` can only be an ES module.
 *
 * In Bun and Deno, the `module` can also be a TypeScript file.
 *
 * Data are cloned and transferred between threads via **Structured Clone Algorithm** (by default).
 *
 * Apart from the standard data types supported by the algorithm, {@link Channel} can also be
 * used to transfer data between threads. To do so, just passed a channel instance to the threaded
 * function.
 *
 * But be aware, channel can only be used as a parameter, return a channel from the threaded
 * function is not allowed. And the channel can only be used for one threaded function at a time,
 * once passed, the data can only be transferred into and out-from the function.
 *
 * The difference between using channel and generator function for streaming processing is, for a
 * generator function, `next(value)` is coupled with a `yield value`, the process is blocked
 * between **next** calls, channel doesn't have this limit, we can use it to stream all the data
 * into the function before processing and receiving any result.
 *
 * @example
 * ```ts
 * const mod = parallel(() => import("./examples/worker.mjs"));
 * console.log(await mod.greet("World")); // Hi, World
 * ```
 *
 * @example
 * ```ts
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
 * const mod = parallel(() => import("./examples/worker.mjs"));
 *
 * const channel = chan<number>();
 * const length = mod.twoTimesValues(channel);
 *
 * for (const value of Number.sequence(0, 9)) {
 *     await channel.push({ value, done: value === 9 });
 * }
 *
 * const results = (await readAll(channel)).map(item => item.value);
 * console.log(results);
 * console.log(await length);
 * // output:
 * // [0, 2, 4, 6, 8, 10, 12, 14, 16, 18]
 * // 10
 * ```
 */
function parallel(module, options = {}) {
    const adapter = (options === null || options === void 0 ? void 0 : options.adapter) || "worker_threads";
    const serialization = adapter === "worker_threads"
        ? "advanced"
        : ((options === null || options === void 0 ? void 0 : options.serialization) || (isBeforeNode14 ? "json" : "advanced"));
    const modId = sanitizeModuleId(module, true);
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
    return new Proxy({
        [terminate]: async () => {
            const poolKey = adapter + ":" + serialization;
            const workerPool = workerPools.get(poolKey);
            if (workerPool) {
                workerPools.delete(poolKey);
                for (const { getWorker } of workerPool) {
                    const worker = await getWorker;
                    if (typeof worker["terminate"] === "function") {
                        await worker.terminate();
                    }
                    else {
                        worker.kill();
                    }
                }
            }
        },
    }, {
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
                        return createRemoteCall(modId, prop, args, baseUrl, {
                            adapter,
                            serialization,
                        });
                    }
                    else {
                        return createLocalCall(modId, prop, args, baseUrl);
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
    /**
     * Marks the given data to be transferred instead of cloned to the worker thread.
     * Once transferred, the data is no longer available on the sending end.
     *
     * Currently, only `ArrayBuffer` is guaranteed to be transferable across all supported
     * JavaScript runtimes.
     *
     * Be aware, the transferable object can only be used as a parameter and only works with
     * `worker_threads` adapter, return a transferable object from the threaded function is
     * not supported at the moment and will always be cloned.
     *
     * NOTE: always prefer channel for transferring large amount of data in streaming fashion
     * than sending them as transferrable objects, it consumes less memory and does not transfer
     * the ownership of the data, and supports `child_process` adapter as well.
     *
     * @example
     * ```ts
     * const mod = parallel(() => import("./examples/worker.mjs"));
     *
     * const arr = Uint8Array.from([0, 1, 2]);
     * const length = await mod.transfer(parallel.transfer(arr.buffer));
     *
     * console.assert(length === 3);
     * console.assert(arr.byteLength === 0);
     * ```
     */
    function transfer(data) {
        // @ts-ignore
        data[shouldTransfer] = true;
        return data;
    }
    parallel.transfer = transfer;
})(parallel || (parallel = {}));
var parallel$1 = parallel;

export { createCallRequest, createWorker, parallel$1 as default, getMaxParallelism, isCallResponse, sanitizeModuleId, terminate, wrapArgs };
//# sourceMappingURL=parallel.js.map
