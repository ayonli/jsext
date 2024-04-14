var _a;
const id = Symbol.for("id");
const isBrowser = typeof window === "object"
    && typeof window.document === "object"
    && typeof window.matchMedia === "function";
const isDeno = typeof Deno === "object";
const isBun = typeof Bun === "object";
const isNode = !isDeno && !isBun
    && typeof process === "object" && !!((_a = process.versions) === null || _a === void 0 ? void 0 : _a.node);
const isNodeBelow14 = isNode && parseInt(process.version.slice(1)) < 14;
const isNodeBelow16 = isNode && parseInt(process.version.slice(1)) < 16;
const isNodeBelow20 = isNode && parseInt(process.version.slice(1)) < 20;
// In Node.js, `process.argv` contains `--worker-thread` when the current thread is used as
// a worker.
const isNodeWorkerThread = isNode && process.argv.includes("--worker-thread");
const isMainThread = !isNodeWorkerThread
    && (isBun ? Bun.isMainThread : typeof WorkerGlobalScope === "undefined");

export { id, isBrowser, isBun, isDeno, isMainThread, isNode, isNodeBelow14, isNodeBelow16, isNodeBelow20 };
//# sourceMappingURL=env.js.map
