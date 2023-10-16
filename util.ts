export const isNode = typeof process === "object" && !!process.versions?.node;
declare var Deno: any;

const moduleCache = new Map();

export async function resolveModule(modId: string, baseUrl: string | undefined = undefined) {
    let module: { [x: string]: any; };

    if (isNode) {
        const { fileURLToPath } = await import("url");
        const path = baseUrl ? fileURLToPath(new URL(modId, baseUrl).href) : modId;
        module = await import(path);
    } else {
        const url = new URL(modId, baseUrl).href;
        module = moduleCache.get(url);

        if (!module) {
            if (typeof Deno === "object") {
                module = await import(url);
                moduleCache.set(url, module);
            } else {
                try {
                    module = await import(url);
                    moduleCache.set(url, module);
                } catch (err) {
                    if (String(err).includes("Failed")) {
                        // The content-type of the response isn't application/javascript, try to
                        // download it and load it with object URL.
                        const res = await fetch(url);
                        const buf = await res.arrayBuffer();
                        const blob = new Blob([new Uint8Array(buf)], {
                            type: "application/javascript",
                        });
                        const _url = URL.createObjectURL(blob);

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
