import { isDedicatedWorker, isSharedWorker, isBrowserWindow } from './env.js';
import { extname } from './path.js';
import { getObjectURL } from './module/util.js';
import { equals } from './path/util.js';

/**
 * Utility functions for working with JavaScript modules.
 * @module
 */
/**
 * @deprecated There was some misunderstanding of this function in the past, it
 * should not be used in the user space anymore.
 */
const _getObjectURL = getObjectURL;
function interop(module, strict = undefined) {
    if (typeof module === "function") {
        return module().then(mod => interop(mod, strict));
    }
    else if (module instanceof Promise) {
        return module.then(mod => interop(mod, strict));
    }
    else if (typeof module === "object" && module !== null && !Array.isArray(module)) {
        if (typeof module["default"] === "object" &&
            module["default"] !== null &&
            !Array.isArray(module["default"])) {
            const hasEsModule = module["__esModule"] === true
                || module["default"]["__esModule"] === true;
            if (hasEsModule) {
                return module["default"];
            }
            else if (strict) {
                return module;
            }
            const moduleKeys = Object.getOwnPropertyNames(module)
                .filter(x => x !== "default" && x !== "__esModule").sort();
            const defaultKeys = Object.getOwnPropertyNames(module["default"])
                .filter(x => x !== "default" && x !== "__esModule").sort();
            if (String(moduleKeys) === String(defaultKeys)) {
                return module["default"];
            }
            else if (strict === false && !moduleKeys.length) {
                return module["default"];
            }
        }
    }
    return module;
}
function isMain(importMeta) {
    if ("main" in importMeta && typeof importMeta["main"] === "boolean") {
        return importMeta["main"];
    }
    if ("serviceWorker" in globalThis && "url" in importMeta) {
        // @ts-ignore
        return globalThis["serviceWorker"]["scriptURL"] === importMeta.url;
    }
    else if ((isDedicatedWorker || isSharedWorker)
        && "url" in importMeta && typeof location === "object" && location) {
        return importMeta.url === location.href;
    }
    if (typeof process === "object" && Array.isArray(process.argv) && process.argv.length) {
        if (!process.argv[1]) {
            // Node.js REPL or the program is executed by `node -e "code"`,
            // or the program is executed by itself.
            return ["<repl>", "[eval]"].includes(importMeta["id"]);
        }
        const filename = "url" in importMeta ? importMeta.url : importMeta["filename"];
        const urlExt = extname(filename);
        let entry = process.argv[1];
        if (!extname(entry) && urlExt) {
            // In Node.js, the extension name may be omitted when starting the script.
            entry += urlExt;
        }
        return equals(filename, entry, { ignoreFileProtocol: true });
    }
    return false;
}
const importCache = new Map();
/**
 * Imports a script from the given URL to the current document, useful for
 * loading 3rd-party libraries dynamically in the browser.
 *
 * NOTE: This function is only available in the browser.
 *
 * @example
 * ```ts
 * import { importScript } from "@ayonli/jsext/module";
 *
 * await importScript("https://code.jquery.com/jquery-3.7.1.min.js");
 *
 * console.assert(typeof jQuery === "function");
 * console.assert($ === jQuery);
 * ```
 */
function importScript(url, options = {}) {
    if (!isBrowserWindow) {
        return Promise.reject(new Error("This function is only available in the browser."));
    }
    url = new URL(url, location.href).href;
    let cache = importCache.get(url);
    if (cache) {
        return cache;
    }
    cache = new Promise((resolve, reject) => {
        getObjectURL(url).then(_url => {
            const script = document.createElement("script");
            script.src = _url;
            script.type = options.type === "module" ? "module" : "text/javascript";
            script.setAttribute("data-src", url);
            script.onload = () => setTimeout(resolve, 0);
            script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
            document.head.appendChild(script);
        }).catch(reject);
    });
    importCache.set(url, cache);
    return cache;
}
/**
 * Imports a stylesheet from the given URL to the current document, useful for
 * loading 3rd-party libraries dynamically in the browser.
 *
 * NOTE: This function is only available in the browser.
 *
 * @example
 * ```ts
 * import { importStylesheet } from "@ayonli/jsext/module";
 *
 * await importStylesheet("https://cdn.jsdelivr.net/npm/bootstrap@3.4.1/dist/css/bootstrap.min.css");
 * ```
 */
function importStylesheet(url) {
    if (!isBrowserWindow) {
        return Promise.reject(new Error("This function is only available in the browser."));
    }
    url = new URL(url, location.href).href;
    let cache = importCache.get(url);
    if (cache) {
        return cache;
    }
    cache = new Promise((resolve, reject) => {
        getObjectURL(url, "text/css").then(_url => {
            const link = document.createElement("link");
            link.href = _url;
            link.rel = "stylesheet";
            link.setAttribute("data-src", url);
            link.onload = () => setTimeout(resolve, 0);
            link.onerror = () => reject(new Error(`Failed to load stylesheet: ${url}`));
            document.head.appendChild(link);
        }).catch(reject);
    });
    importCache.set(url, cache);
    return cache;
}

export { _getObjectURL as getObjectURL, importScript, importStylesheet, interop, isMain };
//# sourceMappingURL=module.js.map
