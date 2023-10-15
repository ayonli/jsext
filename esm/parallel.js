import { ThenableAsyncGenerator } from './external/thenable-generator/index.js';
import chan from './chan.js';
import { sequence } from './number/index.js';
import { trim } from './string/index.js';
import { fromObject } from './error/index.js';

var _a;
const isNode = typeof process === "object" && !!((_a = process.versions) === null || _a === void 0 ? void 0 : _a.node);
const IsPath = /^(\.[\/\\]|\.\.[\/\\]|[a-zA-Z]:|\/)/;
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
function createFFIRequest(script, fn, args, taskId = undefined, type = "ffi") {
    const msg = { type, baseUrl: "", script, fn, args, taskId };
    if (typeof Deno === "object") {
        msg.baseUrl = "file://" + Deno.cwd() + "/";
    }
    else if (isNode) {
        if (IsPath.test(script)) {
            // Only set baseUrl for relative modules, don't set it for node modules.
            msg.baseUrl = process.cwd();
        }
    }
    else if (typeof location === "object") {
        msg.baseUrl = location.href;
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
        if (adapter === "child_process") {
            const { fork } = await import('child_process');
            const isPrior14 = parseInt(process.version.slice(1)) < 14;
            const worker = fork(entry, {
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
            const worker = new Worker(entry);
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
        if (!entry) {
            if (typeof Deno === "object") {
                if (import.meta["main"]) {
                    // code is bundled, try the remote URL
                    entry = "https://ayonli.github.io/jsext/bundle/worker-web.mjs";
                }
                else {
                    entry = [
                        ...(import.meta.url.split("/").slice(0, -1)),
                        "worker-web.mjs"
                    ].join("/");
                }
            }
            else {
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
    return worker;
}
function createCall(script, fn, args) {
    const modId = sanitizeModuleId(script, true);
    const taskId = taskIdCounter.next().value;
    const task = {};
    let worker;
    tasks.set(taskId, task);
    return new ThenableAsyncGenerator({
        async then(onfulfilled, onrejected) {
            if (!worker) {
                worker = await acquireWorker(taskId);
                worker.postMessage(createFFIRequest(modId, fn, args, taskId));
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
                    worker.postMessage(createFFIRequest(modId, fn, args, taskId));
                    await new Promise((resolve) => {
                        task.generate = resolve;
                    });
                }
                (_a = task.channel) !== null && _a !== void 0 ? _a : (task.channel = chan(Infinity));
                worker.postMessage(createFFIRequest(modId, fn, [input], taskId, "next"));
                return await task.channel.pop();
            }
        },
        async return(value) {
            worker === null || worker === void 0 ? void 0 : worker.postMessage(createFFIRequest(modId, fn, [value], taskId, "return"));
            tasks.delete(taskId);
            return { value, done: true };
        },
        async throw(err) {
            worker === null || worker === void 0 ? void 0 : worker.postMessage(createFFIRequest(modId, fn, [err], taskId, "throw"));
            tasks.delete(taskId);
            throw err;
        },
    });
}
/**
 * Wraps a module and run its functions in worker threads.
 *
 * In Node.js and Bun, the `module` can be either a CommonJS module or an ES module,
 * **node_modules** and built-in modules are also supported.
 *
 * In browser and Deno, the `module` can only be an ES module, and is relative to the current URL
 * (or working directory for Deno) if not absolute.
 *
 * In Bun and Deno, the `module` can also be a TypeScript file.
 *
 * @example
 * ```ts
 * const mod = parallel(() => import("./job-example.mjs"));
 * console.log(await mod.greet("World")); // Hi, World
 * ```
 *
 * @example
 * ```ts
 * const mod = parallel(() => import("./job-example.mjs"));
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
    return new Proxy(Object.create(null), {
        get: (_, prop) => {
            const obj = {
                // This syntax will give our remote function a name.
                [prop]: (...args) => {
                    return createCall(module, prop, args);
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
