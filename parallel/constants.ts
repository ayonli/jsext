export const id = Symbol.for("id");

declare var Bun: any;
declare var WorkerGlobalScope: any;

export const isDeno = typeof Deno === "object";
export const isBun = typeof Bun === "object";
export const isNode: boolean = !isDeno && !isBun
    && typeof process === "object" && !!process.versions?.node;

export const isNodeBelow14 = isNode && parseInt(process.version.slice(1)) < 14;
export const isNodeBelow16 = isNode && parseInt(process.version.slice(1)) < 16;
export const isNodeBelow20 = isNode && parseInt(process.version.slice(1)) < 20;

export const IsPath = /^(\.[\/\\]|\.\.[\/\\]|[a-zA-Z]:|\/)/;

// In Node.js, `process.argv` contains `--worker-thread` when the current thread is used as
// a worker.
const isNodeWorkerThread = isNode && process.argv.includes("--worker-thread");
export const isMainThread = !isNodeWorkerThread
    && (isBun ? (Bun.isMainThread as boolean) : typeof WorkerGlobalScope === "undefined");
