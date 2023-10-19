import { id, Channel } from './chan.js';

var _a;
const isDeno = typeof Deno === "object";
const isBun = typeof Bun === "object";
const isNode = !isDeno && !isBun && typeof process === "object" && !!((_a = process.versions) === null || _a === void 0 ? void 0 : _a.node);
const isBeforeNode14 = isNode && parseInt(process.version.slice(1)) < 14;
const moduleCache = new Map();
const channelStore = new Map();
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
async function handleChannelMessage(msg) {
    const channel = channelStore.get(msg.channelId);
    if (!channel)
        return;
    if (msg.type === "push") {
        channel.raw.push(msg.value);
    }
    else if (msg.type === "close") {
        channel.raw.close(msg.value);
        channelStore.delete(msg.channelId);
    }
}
function wrapChannel(channel, channelWrite) {
    const channelId = channel[id];
    if (!channelStore.has(channelId)) {
        const push = channel.push.bind(channel);
        const close = channel.close.bind(channel);
        channelStore.set(channelId, { channel, raw: { push, close } });
    }
    Object.defineProperties(channel, {
        push: {
            configurable: true,
            writable: true,
            value: async (value) => {
                if (channel["state"] !== 1) {
                    throw new Error("the channel is closed");
                }
                await Promise.resolve(channelWrite("push", value, channelId));
            },
        },
        close: {
            configurable: true,
            writable: true,
            value: (err = null) => {
                const record = channelStore.get(channelId);
                record === null || record === void 0 ? void 0 : record.raw.close(err);
                channelWrite("close", err, channelId);
                channelStore.delete(channelId);
                if (record) {
                    // recover to the original methods
                    Object.defineProperties(channel, {
                        push: {
                            configurable: true,
                            writable: true,
                            value: record.raw.push,
                        },
                        close: {
                            configurable: true,
                            writable: true,
                            value: record.raw.close,
                        },
                    });
                }
            },
        },
    });
    return { "@@type": "Channel", "@@id": channelId, "capacity": channel.capacity };
}
function unwrapChannel(obj, channelWrite) {
    var _a;
    const channelId = obj["@@id"];
    let record = channelStore.get(channelId);
    if (!record) {
        const channel = Object.assign(Object.create(Channel.prototype), {
            [id]: channelId,
            capacity: (_a = obj.capacity) !== null && _a !== void 0 ? _a : 0,
            buffer: [],
            producers: [],
            consumers: [],
            error: null,
            state: 1,
        });
        if (!channelStore.has(channelId)) {
            const push = channel.push.bind(channel);
            const close = channel.close.bind(channel);
            channelStore.set(channelId, record = { channel, raw: { push, close } });
        }
        Object.defineProperties(channel, {
            push: {
                configurable: true,
                writable: true,
                value: async (value) => {
                    if (channel["state"] !== 1) {
                        throw new Error("the channel is closed");
                    }
                    await Promise.resolve(channelWrite("push", value, channelId));
                },
            },
            close: {
                configurable: true,
                writable: true,
                value: (err = null) => {
                    const record = channelStore.get(channelId);
                    record === null || record === void 0 ? void 0 : record.raw.close(err);
                    channelWrite("close", err, channelId);
                    channelStore.delete(channelId);
                    if (record) {
                        // recover to the original methods
                        Object.defineProperties(channel, {
                            push: {
                                configurable: true,
                                writable: true,
                                value: record.raw.push,
                            },
                            close: {
                                configurable: true,
                                writable: true,
                                value: record.raw.close,
                            },
                        });
                    }
                },
            },
        });
    }
    return record.channel;
}

export { handleChannelMessage, isBeforeNode14, isBun, isChannelMessage, isDeno, isNode, resolveModule, unwrapChannel, wrapChannel };
//# sourceMappingURL=util.js.map
