import { IsPath, isBun, isDeno, isNode } from "../constants.ts";
import { trim } from "../../string/index.ts";

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
            throw new TypeError("the given script is not a dynamic import expression");
        } else {
            start += offset;
            const end = str.indexOf(")", start);
            _id = trim(str.slice(start, end), ` '"\'`);
        }
    } else {
        _id = id;
    }

    if ((isNode || isBun) && IsPath.test(_id)) {
        if (!/\.[cm]?(js|ts|)x?$/.test(_id)) { // if omitted suffix, add suffix
            _id += isBun ? ".ts" : ".js";
        } else if (isNode) { // replace .ts/.mts/.cts to .js/.mjs/.cjs in Node.js
            if (_id.endsWith(".ts")) {
                _id = _id.slice(0, -3) + ".js";
            } else if (_id.endsWith(".mts")) {
                _id = _id.slice(0, -4) + ".mjs";
            } else if (_id.endsWith(".cts")) { // rare, but should support
                _id = _id.slice(0, -4) + ".cjs";
            } else if (_id.endsWith(".tsx")) { // rare, but should support
                _id = _id.slice(0, -4) + ".js";
            }
        }
    }

    if (!IsPath.test(_id) && !strict) {
        _id = "./" + _id;
    }

    return _id;
}

export async function resolveModule(modId: string, baseUrl: string | undefined = undefined) {
    let module: { [x: string]: any; };

    if (isNode || isBun) {
        const { fileURLToPath } = await import("url");
        const path = baseUrl ? fileURLToPath(new URL(modId, baseUrl).href) : modId;
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
                        const _url = await resolveRemoteModuleUrl(url);
                        module = await import(_url);
                        moduleCache.set(url, module);
                    } else {
                        throw err;
                    }
                }
            }
        }
    }

    if (typeof module["default"] === "object" && typeof module["default"].default !== "undefined") {
        module = module["default"]; // CommonJS module with exports.default
    }

    return module;
}

export async function resolveRemoteModuleUrl(url: string): Promise<string> {
    // Use fetch to download the script and compose an object URL which can
    // bypass CORS security constraint in the browser.
    const res = await fetch(url);
    let blob: Blob;

    if (res.headers.get("content-type")?.includes("/javascript")) {
        blob = await res.blob();
    } else {
        const buf = await res.arrayBuffer();
        blob = new Blob([new Uint8Array(buf)], {
            type: "application/javascript",
        });
    }

    return URL.createObjectURL(blob);
}
