import { isBun, isDeno, isNode } from "../env.ts";
import { isAbsolute, isFsPath, toFsPath } from "../path.ts";
import { trim } from "../string.ts";
import { interop } from "../module.ts";
import { getObjectURL } from "../module/util.ts";

const moduleCache = new Map();

export function sanitizeModuleId(id: string | (() => Promise<any>), strict = false): string {
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
            throw new TypeError("The given script is not a dynamic import expression.");
        } else {
            start += offset;
            const end = str.indexOf(")", start);
            _id = trim(str.slice(start, end), ` '"\'`);
        }
    } else {
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

export async function resolveModule(modId: string, baseUrl: string | undefined = undefined) {
    let module: { [x: string]: any; };

    if (isNode || isBun) {
        const path = baseUrl ? toFsPath(new URL(modId, baseUrl).href) : modId;
        module = await import(path);
    } else {
        const url = new URL(modId, baseUrl).href;
        module = moduleCache.get(url);

        if (!module) {
            if (isDeno) {
                module = await import(url);
                moduleCache.set(url, module);
            } else {
                try {
                    module = await import(url);
                    moduleCache.set(url, module);
                } catch (err) {
                    if (String(err).includes("Failed")) {
                        const _url = await getObjectURL(url);
                        module = await import(_url);
                        moduleCache.set(url, module);
                    } else {
                        throw err;
                    }
                }
            }
        }
    }

    return interop(module);
}
