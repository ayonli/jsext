import { isNodeLike, isDeno } from './env.js';
import { createReadableStream, readFile } from './fs.js';
import { toFsPath, resolve } from './path.js';
import { importWasm as importWasm$1 } from './module/web.js';
export { importScript, importStylesheet, interop, isMain } from './module/web.js';
import { isUrl, isFileUrl } from './path/util.js';

/**
 * Utility functions for working with JavaScript modules.
 * @module
 */
const wasmCache = new Map();
/**
 * Imports a WebAssembly module from a URL or file path (relative to the current
 * working directory if not absolute), or from a {@link WebAssembly.Module}
 * object, returns the symbols exported by the module.
 *
 * This function is available in both the browser and server runtimes such as
 * Node.js, Deno, Bun and Cloudflare Workers.
 *
 * This function uses cache to avoid loading the same module multiple times.
 *
 * @param imports An object containing the values to be imported by the
 * WebAssembly module, allowing passing values from JavaScript to WebAssembly.
 *
 * ```ts
 * import { importWasm } from "@ayonli/jsext/module";
 *
 * const { timestamp } = await importWasm<{
 *     timestamp: () => number; // function exported by the WebAssembly module
 * }>("./examples/convert.wasm", {
 *     // JavaScript module and function passed into the WebAssembly module
 *     Date: { now: Date.now },
 * });
 *
 * console.log("The current timestamp is:", timestamp());
 * ```
 *
 * The corresponding WebAssembly module `convert.wasm` in text format looks like
 * this:
 *
 * ```wat
 * ;; examples/convert.wat
 * (module
 *   (import "Date" "now" (func $now (result i32)))
 *   (func (export "timestamp") (result i32)
 *     call $now
 *     ;; Convert to seconds
 *     i32.const 1000
 *     i32.div_u
 *   )
 * )
 * ```
 *
 * NOTE: In Cloudflare Workers, this function cannot access the file system, we
 * need to import the WebAssembly module with a `import` statement or with the
 * `import()` function before we can use it. For example:
 *
 * ```ts
 * // In Cloudflare Workers
 * import { importWasm } from "@ayonli/jsext/module";
 * import wasmModule from "./examples/convert.wasm";
 *
 * const { timestamp } = await importWasm<{
 *     timestamp: () => number; // function exported by the WebAssembly module
 * }>(wasmModule, {
 *     // JavaScript module and function passed into the WebAssembly module
 *     Date: { now: Date.now },
 * });
 *
 * console.log("The current timestamp is:", timestamp());
 * ```
 *
 * NOTE: Deno v2.1+ has built-in support for importing WebAssembly modules as
 * JavaScript modules, it's recommended to use the built-in `import` statement
 * to import WebAssembly modules directly for Deno programs.
 */
async function importWasm(module, imports = undefined) {
    if ((!isNodeLike && !isDeno) ||
        module instanceof WebAssembly.Module ||
        (module instanceof URL && module.protocol !== "file:") ||
        (typeof module === "string" && isUrl(module) && !isFileUrl(module))) {
        return await importWasm$1(module, imports);
    }
    const src = typeof module === "string" ? module : module.href;
    const filename = isFileUrl(src) ? toFsPath(src) : resolve(src);
    if (typeof WebAssembly.instantiateStreaming === "function") {
        let cache = wasmCache.get(filename);
        if (!cache) {
            const stream = createReadableStream(filename);
            cache = Promise.resolve(new Response(stream, {
                headers: { "Content-Type": "application/wasm" },
            })).then(res => WebAssembly.instantiateStreaming(res, imports))
                .then(ins => ins.instance.exports);
            wasmCache.set(filename, cache);
        }
        return await cache;
    }
    else {
        let cache = wasmCache.get(filename);
        if (!cache) {
            cache = readFile(filename)
                .then(bytes => WebAssembly.instantiate(bytes, imports))
                .then(ins => ins.instance.exports);
            wasmCache.set(filename, cache);
        }
        return await cache;
    }
}

export { importWasm };
//# sourceMappingURL=module.js.map
