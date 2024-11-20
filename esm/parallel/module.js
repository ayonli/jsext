import { isNode, isBun, isDeno } from '../env.js';
import { toFsPath } from '../path.js';
import { trim } from '../string.js';
import { interop } from '../module.js';
import { getObjectURL } from '../module/util.js';
import { isAbsolute, isFsPath } from '../path/util.js';

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
    if (isNode && isFsPath(_id) && !/\.[cm]?(js|ts|)x?$/.test(_id)) {
        _id += ".js"; // In Node.js, if no suffix is provided, it fallback to .js
    }
    if (!strict && !isAbsolute(_id)) {
        _id = "./" + _id;
    }
    return _id;
}
async function resolveModule(modId, baseUrl = undefined) {
    let module;
    if (isNode || isBun) {
        const path = baseUrl ? toFsPath(new URL(modId, baseUrl).href) : modId;
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
                        const _url = await getObjectURL(url);
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

export { resolveModule, sanitizeModuleId };
//# sourceMappingURL=module.js.map
