import { isBrowser } from './env.js';

/**
 * Utility functions for working with JavaScript modules.
 * @module
 */
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
const importCache = new Map();
/**
 * Imports a script from the given URL to the current document, useful for
 * loading 3rd-party libraries dynamically in the browser.
 *
 * NOTE: this function will throw an error if called outside the browser.
 */
function importScript(url, options = {}) {
    if (!isBrowser) {
        return Promise.reject(new Error("This function is only available in the browser."));
    }
    url = new URL(url, location.href).href;
    let cache = importCache.get(url);
    if (cache) {
        return cache;
    }
    cache = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = url;
        script.type = options.type === "module" ? "module" : "text/javascript";
        script.onload = () => setTimeout(resolve, 0);
        script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
        document.head.appendChild(script);
    });
    importCache.set(url, cache);
    return cache;
}
/**
 * Imports a stylesheet from the given URL to the current document, useful for
 * loading 3rd-party libraries dynamically in the browser.
 *
 * NOTE: this function will throw an error if called outside the browser.
 */
function importStylesheet(url) {
    if (!isBrowser) {
        return Promise.reject(new Error("This function is only available in the browser."));
    }
    url = new URL(url, location.href).href;
    let cache = importCache.get(url);
    if (cache) {
        return cache;
    }
    cache = new Promise((resolve, reject) => {
        const link = document.createElement("link");
        link.href = url;
        link.rel = "stylesheet";
        link.onload = () => setTimeout(resolve, 0);
        link.onerror = () => reject(new Error(`Failed to load stylesheet: ${url}`));
        document.head.appendChild(link);
    });
    importCache.set(url, cache);
    return cache;
}

export { importScript, importStylesheet, interop };
//# sourceMappingURL=module.js.map
