var _a;
const isNode = typeof process === "object" && !!((_a = process.versions) === null || _a === void 0 ? void 0 : _a.node);
const moduleCache = new Map();
async function resolveModule(modId, baseUrl = undefined) {
    let module;
    if (isNode) {
        const { fileURLToPath } = await import('url');
        const path = baseUrl ? fileURLToPath(new URL(modId, baseUrl).href) : modId;
        module = await import(path);
    }
    else {
        const url = new URL(modId, baseUrl).href;
        module = moduleCache.get(url);
        if (!module) {
            if (typeof Deno === "object") {
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
                    }
                    else {
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
function isChannelMessage(msg) {
    return msg
        && typeof msg === "object"
        && ["push", "close"].includes(msg.type)
        && typeof msg.channelId === "number";
}

export { isChannelMessage, isNode, resolveModule };
//# sourceMappingURL=util.js.map
