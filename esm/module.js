import { isWebWorker, isBrowser } from './env.js';
import { extname } from './path.js';
import { equals, isUrl } from './path/util.js';

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
function isMain(importMeta) {
    if ("main" in importMeta && typeof importMeta["main"] === "boolean") {
        return importMeta["main"];
    }
    if ("serviceWorker" in globalThis && "url" in importMeta) {
        // @ts-ignore
        return globalThis["serviceWorker"]["scriptURL"] === importMeta.url;
    }
    else if (isWebWorker && "url" in importMeta && typeof location === "object" && location) {
        return importMeta.url === location.href;
    }
    if (typeof process === "object" && Array.isArray(process.argv)) {
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
const urlCache = new Map();
/**
 * This function downloads the resource from the original URL and convert it to
 * an object URL which can bypass the CORS policy in the browser, and convert
 * the response to a new Blob with the correct MIME type if the original one is
 * not matched. It ensures the resource can be loaded correctly in the browser.
 */
async function getObjectURL(src, mimeType = "text/javascript") {
    var _a;
    const isAbsolute = isUrl(src);
    let cache = isAbsolute ? urlCache.get(src) : undefined;
    if (cache) {
        return cache;
    }
    // Use fetch to download the script and compose an object URL which can
    // bypass CORS security constraint in the browser.
    const res = await fetch(src);
    let blob;
    if (!res.ok) {
        throw new Error(`Failed to fetch resource: ${src}`);
    }
    // JavaScript has more than one MIME types, so we just check it loosely.
    const type = mimeType.includes("javascript") ? "javascript" : mimeType;
    if ((_a = res.headers.get("content-type")) === null || _a === void 0 ? void 0 : _a.includes(type)) {
        blob = await res.blob();
    }
    else {
        // If the MIME type is not matched, we need to convert the response to
        // a new Blob with the correct MIME type.
        const buf = await res.arrayBuffer();
        blob = new Blob([new Uint8Array(buf)], {
            type: mimeType,
        });
    }
    cache = URL.createObjectURL(blob);
    isAbsolute && urlCache.set(src, cache);
    return cache;
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

export { getObjectURL, importScript, importStylesheet, interop, isMain };
//# sourceMappingURL=module.js.map
