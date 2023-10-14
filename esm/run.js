import { sequence } from './number/index.js';
import { trim } from './string/index.js';
import chan from './chan.js';
import deprecate from './deprecate.js';
import { ThenableAsyncGenerator } from './external/thenable-generator/index.js';

var _a;
const isNode = typeof process === "object" && !!((_a = process.versions) === null || _a === void 0 ? void 0 : _a.node);
const workerIdCounter = sequence(1, Number.MAX_SAFE_INTEGER, 1, true);
let workerPool = [];
// The worker consumer queue is nothing but a callback list, once a worker is available, the runner
// pop a consumer and run the callback, which will retry gaining the worker and retry the task.
const workerConsumerQueue = [];
async function run(script, args = undefined, options = undefined) {
    var _a, _b;
    let _script = "";
    if (typeof script === "function") {
        let str = script.toString();
        let start = str.lastIndexOf("(");
        if (start === -1) {
            throw new TypeError("the given script is not a dynamic import expression");
        }
        else {
            start += 1;
            const end = str.indexOf(")", start);
            _script = trim(str.slice(start, end), ` '"\'`);
        }
    }
    else {
        _script = script;
    }
    const msg = {
        type: "ffi",
        script: _script,
        baseUrl: "",
        fn: (options === null || options === void 0 ? void 0 : options.fn) || "default",
        args: args !== null && args !== void 0 ? args : [],
    };
    if (typeof Deno === "object") {
        msg.baseUrl = "file://" + Deno.cwd() + "/";
    }
    else if (isNode) {
        msg.baseUrl = "file://" + process.cwd() + "/";
    }
    else if (typeof location === "object") {
        msg.baseUrl = location.href;
    }
    if (options === null || options === void 0 ? void 0 : options.workerEntry) {
        deprecate("options.workerEntry", run, "set `run.workerEntry` instead");
    }
    let entry = (options === null || options === void 0 ? void 0 : options.workerEntry) || run.workerEntry;
    let error = null;
    let result;
    let resolver;
    let channel = undefined;
    let workerId;
    let poolRecord;
    let release;
    let terminate = () => Promise.resolve(void 0);
    const timeout = (options === null || options === void 0 ? void 0 : options.timeout) ? setTimeout(() => {
        const err = new Error(`operation timeout after ${options.timeout}ms`);
        if (resolver) {
            resolver.reject(err);
        }
        else {
            error = err;
        }
        terminate();
    }, options.timeout) : null;
    const handleMessage = (msg) => {
        var _a;
        if (msg && typeof msg === "object" && typeof msg.type === "string") {
            timeout && clearTimeout(timeout);
            if (msg.type === "error") {
                return handleError(msg.error);
            }
            else if (msg.type === "return") {
                if (options === null || options === void 0 ? void 0 : options.keepAlive) {
                    // Release before resolve.
                    release === null || release === void 0 ? void 0 : release();
                    if (workerConsumerQueue.length) {
                        // Queued consumer now has chance to gain the worker.
                        (_a = workerConsumerQueue.shift()) === null || _a === void 0 ? void 0 : _a();
                    }
                }
                else {
                    terminate();
                }
                if (resolver) {
                    resolver.resolve(msg.value);
                }
                else {
                    result = { value: msg.value };
                }
                if (channel) {
                    channel.close();
                }
            }
            else if (msg.type === "yield") {
                if (msg.done) {
                    // The final message of yield event is the return value.
                    handleMessage({ type: "return", value: msg.value });
                }
                else {
                    channel === null || channel === void 0 ? void 0 : channel.push(msg.value);
                }
            }
        }
    };
    const handleError = (err) => {
        timeout && clearTimeout(timeout);
        if (resolver) {
            resolver.reject(err);
        }
        else {
            error = err;
        }
        if (channel) {
            channel.close(err);
        }
    };
    const handleExit = () => {
        var _a;
        timeout && clearTimeout(timeout);
        if (poolRecord) {
            // Clean the pool before resolve.
            workerPool = workerPool.filter(record => record !== poolRecord);
            if (workerConsumerQueue.length) {
                // Queued consumer now has chance to create new worker.
                (_a = workerConsumerQueue.shift()) === null || _a === void 0 ? void 0 : _a();
            }
        }
        if (resolver) {
            resolver.resolve(void 0);
        }
        else if (!error && !result) {
            result = { value: void 0 };
        }
        if (channel) {
            channel.close();
        }
    };
    if (isNode) {
        if (!entry) {
            const path = await import('path');
            const { fileURLToPath } = await import('url');
            const _filename = fileURLToPath(import.meta.url);
            const _dirname = path.dirname(_filename);
            if (_filename === process.argv[1]) {
                // The code is bundled, try the worker entry in node_modules (if it exists).
                entry = "./node_modules/@ayonli/jsext/bundle/worker.mjs";
            }
            else if ([
                path.join("jsext", "cjs"),
                path.join("jsext", "esm"),
                path.join("jsext", "bundle")
            ].some(path => _dirname.endsWith(path))) { // compiled
                entry = path.join(path.dirname(_dirname), "bundle", "worker.mjs");
            }
            else {
                entry = path.join(_dirname, "worker.mjs");
            }
        }
        if ((options === null || options === void 0 ? void 0 : options.adapter) === "child_process") {
            let worker;
            let ok = true;
            poolRecord = workerPool.find(item => {
                return item.adapter === "child_process" && !item.busy;
            });
            if (poolRecord) {
                worker = poolRecord.worker;
                workerId = poolRecord.workerId;
                poolRecord.busy = true;
            }
            else if (workerPool.length < run.maxWorkers) {
                const { fork } = await import('child_process');
                const isPrior14 = parseInt(process.version.slice(1)) < 14;
                worker = fork(entry, {
                    stdio: "inherit",
                    serialization: isPrior14 ? "advanced" : "json",
                });
                worker.unref();
                workerId = worker.pid;
                ok = await new Promise((resolve) => {
                    worker.once("exit", () => {
                        if (error) {
                            // The child process took too long to start and cause timeout error.
                            resolve(false);
                        }
                    });
                    worker.once("message", () => {
                        worker.removeAllListeners("exit");
                        resolve(true);
                    });
                });
                // Fill the worker pool regardless the current call should keep-alive or not,
                // this will make sure that the total number of workers will not exceed the
                // `run.maxWorkers`. If the the call doesn't keep-alive the worker, it will be
                // cleaned after the call.
                ok && workerPool.push(poolRecord = {
                    workerId,
                    worker,
                    adapter: "child_process",
                    busy: true,
                });
            }
            else {
                // Put the current call in the consumer queue if there are no workers available,
                // once an existing call finishes, the queue will pop the its head consumer and
                // retry.
                return new Promise((resolve) => {
                    workerConsumerQueue.push(resolve);
                }).then(() => run(_script, args, options));
            }
            release = () => {
                // Remove the event listener so that later calls will not mess up.
                worker.off("message", handleMessage);
                poolRecord && (poolRecord.busy = false);
            };
            terminate = () => Promise.resolve(void worker.kill(1));
            if (ok) {
                worker.send(msg);
                worker.on("message", handleMessage);
                worker.once("error", handleError);
                worker.once("exit", handleExit);
            }
        }
        else {
            let worker;
            let ok = true;
            poolRecord = workerPool.find(item => {
                return item.adapter === "worker_threads" && !item.busy;
            });
            if (poolRecord) {
                worker = poolRecord.worker;
                workerId = poolRecord.workerId;
                poolRecord.busy = true;
            }
            else if (workerPool.length < run.maxWorkers) {
                const { Worker } = await import('worker_threads');
                worker = new Worker(entry);
                worker.unref();
                // `threadId` may not exist in Bun.
                workerId = (_a = worker.threadId) !== null && _a !== void 0 ? _a : workerIdCounter.next().value;
                ok = await new Promise((resolve) => {
                    worker.once("exit", () => {
                        if (error) {
                            // The child process took too long to start and cause timeout error.
                            resolve(false);
                        }
                    });
                    worker.once("online", () => {
                        worker.removeAllListeners("exit");
                        resolve(true);
                    });
                });
                ok && workerPool.push(poolRecord = {
                    workerId,
                    worker,
                    adapter: "worker_threads",
                    busy: true,
                });
            }
            else {
                return new Promise((resolve) => {
                    workerConsumerQueue.push(resolve);
                }).then(() => run(_script, args, options));
            }
            release = () => {
                worker.off("message", handleMessage);
                poolRecord && (poolRecord.busy = false);
            };
            terminate = async () => void (await worker.terminate());
            if (ok) {
                worker.postMessage(msg);
                worker.on("message", handleMessage);
                worker.once("error", handleError);
                worker.once("messageerror", handleError);
                worker.once("exit", handleExit);
            }
        }
    }
    else {
        let worker;
        poolRecord = workerPool.find(item => {
            return item.adapter === "worker_threads" && !item.busy;
        });
        if (poolRecord) {
            worker = poolRecord.worker;
            workerId = poolRecord.workerId;
            poolRecord.busy = true;
        }
        else if (workerPool.length < run.maxWorkers) {
            let url;
            if (typeof Deno === "object") {
                // Deno can load the module regardless of MINE type.
                if (entry) {
                    url = entry;
                }
                else if (import.meta["main"]) {
                    // code is bundled, try the remote URL
                    url = "https://ayonli.github.io/jsext/bundle/worker-web.mjs";
                }
                else {
                    url = [
                        ...(import.meta.url.split("/").slice(0, -1)),
                        "worker-web.mjs"
                    ].join("/");
                }
            }
            else {
                const _url = entry || "https://ayonli.github.io/jsext/bundle/worker-web.mjs";
                const res = await fetch(_url);
                let blob;
                if ((_b = res.headers.get("content-type")) === null || _b === void 0 ? void 0 : _b.includes("/javascript")) {
                    blob = await res.blob();
                }
                else {
                    const buf = await res.arrayBuffer();
                    blob = new Blob([new Uint8Array(buf)], {
                        type: "application/javascript",
                    });
                }
                url = URL.createObjectURL(blob);
            }
            worker = new Worker(url, { type: "module" });
            workerId = workerIdCounter.next().value;
            workerPool.push(poolRecord = {
                workerId,
                worker,
                adapter: "worker_threads",
                busy: true,
            });
        }
        else {
            return new Promise((resolve) => {
                workerConsumerQueue.push(resolve);
            }).then(() => run(_script, args, options));
        }
        release = () => {
            worker.onmessage = null;
            poolRecord && (poolRecord.busy = false);
        };
        terminate = async () => {
            await Promise.resolve(worker.terminate());
            handleExit();
        };
        worker.postMessage(msg);
        worker.onmessage = (ev) => handleMessage(ev.data);
        worker.onerror = (ev) => handleMessage(ev.error || new Error(ev.message));
        worker.onmessageerror = () => {
            handleError(new Error("unable to deserialize the message"));
        };
    }
    return {
        workerId,
        async abort() {
            timeout && clearTimeout(timeout);
            await terminate();
        },
        async result() {
            return await new Promise((resolve, reject) => {
                if (error) {
                    reject(error);
                }
                else if (result) {
                    resolve(result.value);
                }
                else {
                    resolver = { resolve, reject };
                }
            });
        },
        iterate() {
            if (resolver) {
                throw new Error("result() has been called");
            }
            else if (result) {
                throw new TypeError("the response is not iterable");
            }
            channel = chan(Infinity);
            return {
                [Symbol.asyncIterator]: channel[Symbol.asyncIterator].bind(channel),
            };
        },
    };
}
(function (run) {
    /**
     * The maximum number of workers allowed to exist at the same time.
     */
    run.maxWorkers = 16;
})(run || (run = {}));
var run$1 = run;
/**
 * Creates a remote module wrapper whose functions are run in another thread.
 *
 * This function uses `run()` under the hood, and the remote function must be async.
 *
 * @example
 * ```ts
 * const mod = link(() => import("./job-example.mjs"));
 * console.log(await mod.greet("World")); // Hi, World
 * ```
 *
 * @example
 * ```ts
 * const mod = link(() => import("./job-example.mjs"));
 *
 * for await (const word of mod.sequence(["foo", "bar"])) {
 *     console.log(word);
 * }
 * // output:
 * // foo
 * // bar
 * ```
 */
function link(importFn, options = {}) {
    return new Proxy(Object.create(null), {
        get: (_, prop) => {
            return (...args) => {
                let job;
                let iter;
                return new ThenableAsyncGenerator({
                    async next() {
                        var _a;
                        job !== null && job !== void 0 ? job : (job = await run(importFn, args, {
                            ...options,
                            fn: prop,
                            keepAlive: (_a = options.keepAlive) !== null && _a !== void 0 ? _a : true,
                        }));
                        iter !== null && iter !== void 0 ? iter : (iter = job.iterate()[Symbol.asyncIterator]());
                        let { done = false, value } = await iter.next();
                        if (done) {
                            // HACK: this will set the internal result of ThenableAsyncGenerator
                            // to the result of the job.
                            value = await job.result();
                        }
                        return Promise.resolve({ done, value });
                    },
                    async then(onfulfilled, onrejected) {
                        job !== null && job !== void 0 ? job : (job = await run(importFn, args, {
                            ...options,
                            fn: prop,
                        }));
                        return job.result().then(onfulfilled, onrejected);
                    },
                });
            };
        }
    });
}

export { run$1 as default, link };
//# sourceMappingURL=run.js.map
