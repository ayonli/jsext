import { ThenableAsyncGenerator } from './external/thenable-generator/index.js';
import chan from './chan.js';
import { sequence } from './number/index.js';
import { trim } from './string/index.js';
import { toObject, fromObject } from './error/index.js';
import { isNode, resolveModule } from './util.js';

const IsPath = /^(\.[\/\\]|\.\.[\/\\]|[a-zA-Z]:|\/)/;
const isMainThread = isNode
    ? (!process.argv.includes("--worker-thread") && !process.env["__WORKER_THREAD"])
    // @ts-ignore
    : typeof WorkerGlobalScope === "undefined";
const workerIdCounter = sequence(1, Number.MAX_SAFE_INTEGER, 1, true);
const taskIdCounter = sequence(1, Number.MAX_SAFE_INTEGER, 1, true);
const tasks = new Map;
let workerPool = [];
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
        if (typeof Bun === "object") {
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
function createFFIRequest(init) {
    const msg = { ...init, type: init.type || "ffi" };
    if (!msg.baseUrl) {
        if (typeof Deno === "object") {
            msg.baseUrl = "file://" + Deno.cwd() + "/";
        }
        else if (isNode) {
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
function isFFIResponse(msg) {
    return msg && typeof msg === "object" && ["return", "yield", "error", "gen"].includes(msg.type);
}
async function createWorker(options = {}) {
    var _a, _b;
    let { entry, adapter } = options;
    if (isNode) {
        if (!entry) {
            const path = await import('path');
            const { fileURLToPath } = await import('url');
            const _filename = fileURLToPath(import.meta.url);
            if (_filename === process.argv[1]) {
                // The code is bundled, try the worker entry in node_modules (hope it exists).
                entry = "./node_modules/@ayonli/jsext/bundle/worker.mjs";
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
                if (typeof Bun === "object") {
                    entry = path.join(_dirname, "worker.ts");
                }
                else {
                    entry = path.join(_dirname, "bundle", "worker.mjs");
                }
            }
        }
        if (adapter === "child_process") {
            const { fork } = await import('child_process');
            const isPrior14 = parseInt(process.version.slice(1)) < 14;
            const worker = fork(entry, ["--worker-thread"], {
                stdio: "inherit",
                serialization: isPrior14 ? "advanced" : "json",
            });
            const workerId = worker.pid;
            return {
                worker,
                workerId,
                kind: "node_process",
            };
        }
        else {
            const { Worker } = await import('worker_threads');
            const options = {};
            if (typeof Bun === "object") {
                // Currently, Bun doesn't support `argv` option, use `env` for compatibility
                // support.
                options.env = { ...process.env, __WORKER_THREAD: "true" };
            }
            else {
                options.argv = ["--worker-thread"];
            }
            const worker = new Worker(entry, options);
            // `threadId` may not exist in Bun.
            const workerId = (_a = worker.threadId) !== null && _a !== void 0 ? _a : workerIdCounter.next().value;
            return {
                worker,
                workerId,
                kind: "node_worker",
            };
        }
    }
    else {
        if (typeof Deno === "object") {
            if (!entry) {
                if (import.meta["main"]) {
                    // The code is bundled, try the remote worker entry.
                    entry = "https://ayonli.github.io/jsext/bundle/worker-web.mjs";
                }
                else {
                    entry = [
                        ...(import.meta.url.split("/").slice(0, -1)),
                        "worker-web.ts"
                    ].join("/");
                    // The application imports the compiled version of this module,
                    // redirect to the source worker entry.
                    if (entry.endsWith("/esm/worker-web.ts")) {
                        entry = entry.slice(0, -18) + "/worker-web.ts";
                    }
                }
            }
        }
        else {
            // Use fetch to download the script and compose an object URL can bypass CORS
            // security constraint in the browser.
            const url = entry || "https://ayonli.github.io/jsext/bundle/worker-web.mjs";
            const res = await fetch(url);
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
    let poolRecord = workerPool.find(item => !item.tasks.size);
    let worker;
    if (poolRecord) {
        poolRecord.lastAccess = Date.now();
        worker = poolRecord.worker;
    }
    else if (workerPool.length < parallel.maxWorkers) {
        const res = await createWorker({ entry: parallel.workerEntry, adapter: "worker_threads" });
        worker = res.worker;
        const handleMessage = (msg) => {
            var _a, _b;
            if (isFFIResponse(msg) && msg.taskId) {
                const task = tasks.get(msg.taskId);
                if (!task) {
                    return;
                }
                if (msg.type === "error") {
                    const err = msg.error instanceof Error
                        ? msg.error
                        : fromObject(msg.error);
                    if (task.resolver) {
                        task.resolver.reject(err);
                    }
                    else if (task.channel) {
                        task.channel.close(err);
                    }
                    else {
                        task.error = err;
                    }
                }
                else if (msg.type === "return") {
                    if (task.resolver) {
                        task.resolver.resolve(msg.value);
                    }
                    else {
                        task.result = { value: msg.value };
                    }
                    if (task.channel) {
                        task.channel.close();
                    }
                    if (poolRecord) {
                        poolRecord.tasks.delete(msg.taskId);
                        if (!poolRecord.tasks.size) {
                            if (isNode) {
                                // Allow the main thread to exit if the event loop is empty.
                                worker.unref();
                            }
                        }
                        { // GC: clean long-time unused workers
                            const now = Date.now();
                            const idealItems = [];
                            workerPool = workerPool.filter(item => {
                                const ideal = !item.tasks.size && (now - item.lastAccess) >= 300000;
                                if (ideal) {
                                    idealItems.push(item);
                                }
                                return !ideal;
                            });
                            idealItems.forEach(item => {
                                item.worker.terminate();
                            });
                        }
                    }
                }
                else if (msg.type === "yield") {
                    (_a = task.channel) === null || _a === void 0 ? void 0 : _a.push({ value: msg.value, done: msg.done });
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
                    (_b = task.generate) === null || _b === void 0 ? void 0 : _b.call(task);
                }
            }
        };
        if (isNode) {
            worker.on("message", handleMessage);
            await new Promise(resolve => worker.once("online", resolve));
        }
        else {
            worker.onmessage = (ev) => handleMessage(ev.data);
        }
        workerPool.push(poolRecord = {
            worker,
            tasks: new Set(),
            lastAccess: Date.now(),
        });
    }
    else {
        poolRecord = workerPool[taskId % workerPool.length];
        poolRecord.lastAccess = Date.now();
        worker = poolRecord.worker;
    }
    poolRecord.tasks.add(taskId);
    if (isNode) {
        // Prevent premature exit in the main thread.
        worker.ref();
    }
    return worker;
}
function createRemoteCall(modId, fn, args, baseUrl = undefined) {
    let worker;
    const taskId = taskIdCounter.next().value;
    tasks.set(taskId, {});
    return new ThenableAsyncGenerator({
        async then(onfulfilled, onrejected) {
            if (!worker) {
                worker = await acquireWorker(taskId);
                worker.postMessage(createFFIRequest({
                    script: modId,
                    fn,
                    args,
                    taskId,
                    baseUrl: baseUrl
                }));
            }
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
                return new Promise((resolve, reject) => {
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
                }).then(onfulfilled, onrejected);
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
                if (!worker) {
                    worker = await acquireWorker(taskId);
                    worker.postMessage(createFFIRequest({
                        script: modId,
                        fn,
                        args,
                        taskId,
                        baseUrl: baseUrl
                    }));
                    await new Promise((resolve) => {
                        task.generate = resolve;
                    });
                }
                (_a = task.channel) !== null && _a !== void 0 ? _a : (task.channel = chan(Infinity));
                worker.postMessage(createFFIRequest({
                    script: modId,
                    fn,
                    args: [input],
                    taskId,
                    type: "next",
                    baseUrl: baseUrl,
                }));
                return await task.channel.pop();
            }
        },
        async return(value) {
            tasks.delete(taskId);
            worker === null || worker === void 0 ? void 0 : worker.postMessage(createFFIRequest({
                script: modId,
                fn,
                args: [value],
                taskId,
                type: "return",
                baseUrl: baseUrl,
            }));
            return { value, done: true };
        },
        async throw(err) {
            tasks.delete(taskId);
            worker === null || worker === void 0 ? void 0 : worker.postMessage(createFFIRequest({
                script: modId,
                fn,
                args: [toObject(err)],
                taskId,
                type: "throw",
                baseUrl: baseUrl,
            }));
            throw err;
        },
    });
}
function createLocalCall(modId, fn, args, baseUrl = undefined) {
    let generator;
    return new ThenableAsyncGenerator({
        async then(onfulfilled, onrejected) {
            const module = await resolveModule(modId, baseUrl);
            return Promise.resolve(module[fn](...args)).then(onfulfilled, onrejected);
        },
        async next(input) {
            if (!generator) {
                const module = await resolveModule(modId, baseUrl);
                generator = module[fn](...args);
            }
            return await generator.next(input);
        },
        async return(value) {
            if (generator) {
                return await generator.return(value);
            }
            else {
                return { value, done: true };
            }
        },
        async throw(err) {
            if (generator) {
                return await generator.throw(err);
            }
            else {
                throw err;
            }
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
 * In Node.js and Bun, the `module` can be either a CommonJS module or an ES module,
 * **node_modules** and built-in modules are also supported.
 *
 * In browser and Deno, the `module` can only be an ES module.
 *
 * In Bun and Deno, the `module` can also be a TypeScript file.
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
 */
function parallel(module) {
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
    return new Proxy(Object.create(null), {
        get: (_, prop) => {
            const obj = {
                // This syntax will give our remote function a name.
                [prop]: (...args) => {
                    if (isMainThread) {
                        return createRemoteCall(modId, prop, args, baseUrl);
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
     * The maximum number of workers allowed to exist at the same time.
     */
    parallel.maxWorkers = 16;
})(parallel || (parallel = {}));
var parallel$1 = parallel;

export { createFFIRequest, createWorker, parallel$1 as default, isFFIResponse, sanitizeModuleId };
//# sourceMappingURL=parallel.js.map
