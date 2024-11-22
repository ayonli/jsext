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
 * working directory), or from a {@link WebAssembly.Module} object, returns the
 * symbols exported by the module.
 *
 * This function is available in both the browser and server runtimes such as
 * Node.js, Deno, Bun and Cloudflare Workers.
 *
 * This function uses cache to avoid loading the same module multiple times.
 *
 * NOTE: Deno v2.1+ has built-in support for importing WebAssembly modules as
 * JavaScript modules, it's recommended to use the built-in `import` statement
 * to import WebAssembly modules directly for Deno programs.
 *
 * @param imports An object containing the values to be imported by the
 * WebAssembly module, allowing passing values from JavaScript to WebAssembly.
 *
 * @example
 * ```ts
 * import { importWasm } from "@ayonli/jsext/module";
 *
 * const { timestamp } = await importWasm<{
 *     timestamp: () => number; // function exported by the WebAssembly module
 * }>("./examples/simple.wasm", {
 *     time: { // JavaScript namespace and functions passed into the WebAssembly module
 *         unix: () => {
 *             return Math.floor(Date.now() / 1000);
 *         },
 *     },
 * });
 *
 * console.log("The current timestamp is:", timestamp());
 * ```
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
