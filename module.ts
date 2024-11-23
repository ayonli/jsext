/**
 * Utility functions for working with JavaScript modules.
 * @module 
 */

import { isDeno, isNodeLike } from "./env.ts";
import { createReadableStream, readFile } from "./fs.ts";
import { isFileUrl, isUrl, resolve, toFsPath } from "./path.ts";
import { importWasm as webImportWasm } from "./module/web.ts";

export * from "./module/web.ts";

const wasmCache = new Map<string | WebAssembly.Module, Promise<WebAssembly.Exports>>();

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
 * 
 * NOTE: In Cloudflare Workers, this function cannot access the file system, we
 * need to import the WebAssembly module with a `import` statement or with the
 * `import()` function before we can use it. For example:
 * 
 * @example
 * ```ts
 * // In Cloudflare Workers
 * import { importWasm } from "@ayonli/jsext/module";
 * import wasmModule from "./examples/simple.wasm";
 * 
 * const { timestamp } = await importWasm<{
 *     timestamp: () => number; // function exported by the WebAssembly module
 * }>(wasmModule, {
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
export async function importWasm<T extends WebAssembly.Exports>(
    module: string | URL | WebAssembly.Module,
    imports: WebAssembly.Imports | undefined = undefined
): Promise<T> {
    if ((!isNodeLike && !isDeno) ||
        module instanceof WebAssembly.Module ||
        (module instanceof URL && module.protocol !== "file:") ||
        (typeof module === "string" && isUrl(module) && !isFileUrl(module))
    ) {
        return await webImportWasm<T>(module, imports);
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

        return await cache as T;
    } else {
        let cache = wasmCache.get(filename);

        if (!cache) {
            cache = readFile(filename)
                .then(bytes => WebAssembly.instantiate(bytes, imports))
                .then(ins => ins.instance.exports);
            wasmCache.set(filename, cache);
        }

        return await cache as T;
    }
}
