import { isNode, isBun, IsPath, isDeno } from '../constants.js';
import { trim } from '../../string.js';
import { interop } from '../../module.js';

const moduleCache = new Map();
function sanitizeModuleId(id, strict = false) {
    let _id = "";
    if (typeof id === "function") {
        let str = id.toString();
        let offset = "import(".length;
        let start = str.lastIndexOf("import(");
        if (start === -1) {
            offset = "require(".length;
            start = str.lastIndexOf("require(");
        }
        if (start === -1) {
            throw new TypeError("the given script is not a dynamic import expression");
        }
        else {
            start += offset;
            const end = str.indexOf(")", start);
            _id = trim(str.slice(start, end), ` '"\'`);
        }
    }
    else {
        _id = id;
    }
    if ((isNode || isBun) && IsPath.test(_id)) {
        if (!/\.[cm]?(js|ts|)x?$/.test(_id)) { // if omitted suffix, add suffix
            _id += isBun ? ".ts" : ".js";
        }
        else if (isNode) { // replace .ts/.mts/.cts to .js/.mjs/.cjs in Node.js
            if (_id.endsWith(".ts")) {
                _id = _id.slice(0, -3) + ".js";
            }
            else if (_id.endsWith(".mts")) {
                _id = _id.slice(0, -4) + ".mjs";
            }
            else if (_id.endsWith(".cts")) { // rare, but should support
                _id = _id.slice(0, -4) + ".cjs";
            }
            else if (_id.endsWith(".tsx")) { // rare, but should support
                _id = _id.slice(0, -4) + ".js";
            }
        }
    }
    if (!IsPath.test(_id) && !strict) {
        _id = "./" + _id;
    }
    return _id;
}
async function resolveModule(modId, baseUrl = undefined) {
    let module;
    if (isNode || isBun) {
        const { fileURLToPath } = await import('url');
        const path = baseUrl ? fileURLToPath(new URL(modId, baseUrl).href) : modId;
        module = await import(path);
    }
    else {
        const url = new URL(modId, baseUrl).href;
        module = moduleCache.get(url);
        if (!module) {
            if (isDeno) {
                module = await import(url);
                moduleCache.set(url, module);
            }
            else {
                try {
                    module = await import(url);
                    moduleCache.set(url, module);
                }
                catch (err) {
                    if (String(err).includes("Failed")) {
                        const _url = await resolveRemoteModuleUrl(url);
                        module = await import(_url);
                        moduleCache.set(url, module);
                    }
                    else {
                        throw err;
                    }
                }
            }
        }
    }
    return interop(module);
}
async function resolveRemoteModuleUrl(url) {
    var _a;
    // Use fetch to download the script and compose an object URL which can
    // bypass CORS security constraint in the browser.
    const res = await fetch(url);
    let blob;
    if ((_a = res.headers.get("content-type")) === null || _a === void 0 ? void 0 : _a.includes("/javascript")) {
        blob = await res.blob();
    }
    else {
        const buf = await res.arrayBuffer();
        blob = new Blob([new Uint8Array(buf)], {
            type: "application/javascript",
        });
    }
    return URL.createObjectURL(blob);
}

export { resolveModule, resolveRemoteModuleUrl, sanitizeModuleId };
//# sourceMappingURL=module.js.map
