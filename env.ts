export const id = Symbol.for("id");

declare const Bun: any;
declare const WorkerGlobalScope: any;

export const isBrowser = typeof window === "object"
    && typeof window.document === "object"
    && typeof window.matchMedia === "function";
export const isDeno = typeof Deno === "object";
export const isBun = typeof Bun === "object";
export const isNode: boolean = !isDeno && !isBun
    && typeof process === "object" && !!process.versions?.node;

export const isNodeBelow14 = isNode && parseInt(process.version.slice(1)) < 14;
export const isNodeBelow16 = isNode && parseInt(process.version.slice(1)) < 16;
export const isNodeBelow20 = isNode && parseInt(process.version.slice(1)) < 20;

// In Node.js, `process.argv` contains `--worker-thread` when the current thread is used as
// a worker.
const isNodeWorkerThread = isNode && process.argv.includes("--worker-thread");
export const isMainThread = !isNodeWorkerThread
    && (isBun ? (Bun.isMainThread as boolean) : typeof WorkerGlobalScope === "undefined");
