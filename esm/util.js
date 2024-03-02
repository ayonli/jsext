import { id, Channel } from './chan.js';

var _a;
const isDeno = typeof Deno === "object";
const isBun = typeof Bun === "object";
const isNode = !isDeno && !isBun && typeof process === "object" && !!((_a = process.versions) === null || _a === void 0 ? void 0 : _a.node);
const isNodePrior14 = isNode && parseInt(process.version.slice(1)) < 14;
const IsPath = /^(\.[\/\\]|\.\.[\/\\]|[a-zA-Z]:|\/)/;
// In Node.js, `process.argv` contains `--worker-thread` when the current thread is used as
// a worker.
const isNodeWorkerThread = isNode && process.argv.includes("--worker-thread");
const isMainThread = !isNodeWorkerThread
    && (isBun ? Bun.isMainThread : typeof WorkerGlobalScope === "undefined");
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
    const record = channelStore.get(msg.channelId);
    if (!record)
        return;
    if (msg.type === "push") {
        await record.raw.push(msg.value);
    }
    else if (msg.type === "close") {
        const { value: err, channelId } = msg;
        record.raw.close(err);
        channelStore.delete(channelId);
        if (isMainThread && record.writers.length > 1) {
            // distribute the channel close event to all threads
            record.writers.forEach(write => {
                write("close", err, channelId);
            });
        }
    }
}
function wireChannel(channel, channelWrite) {
    const channelId = channel[id];
    if (!channelStore.has(channelId)) {
        const push = channel.push.bind(channel);
        const close = channel.close.bind(channel);
        channelStore.set(channelId, {
            channel,
            raw: { push, close },
            writers: [channelWrite],
            counter: 0,
        });
        Object.defineProperties(channel, {
            push: {
                configurable: true,
                writable: true,
                value: async (data) => {
                    const record = channelStore.get(channelId);
                    if (record) {
                        const channel = record.channel;
                        if (channel["state"] !== 1) {
                            throw new Error("the channel is closed");
                        }
                        const write = record.writers[record.counter++ % record.writers.length];
                        await Promise.resolve(write("push", data, channelId));
                    }
                },
            },
            close: {
                configurable: true,
                writable: true,
                value: (err = null) => {
                    const record = channelStore.get(channelId);
                    if (record) {
                        channelStore.delete(channelId);
                        const channel = record.channel;
                        record.writers.forEach(write => {
                            write("close", err, channelId);
                        });
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
                        channel.close(err);
                    }
                },
            },
        });
    }
    else {
        const record = channelStore.get(channelId);
        record.writers.push(channelWrite);
    }
}
function wrapChannel(channel, channelWrite) {
    wireChannel(channel, channelWrite);
    return { "@@type": "Channel", "@@id": channel[id], "capacity": channel.capacity };
}
function unwrapChannel(obj, channelWrite) {
    var _a, _b;
    const channelId = obj["@@id"];
    let channel = (_a = channelStore.get(channelId)) === null || _a === void 0 ? void 0 : _a.channel;
    if (!channel) {
        channel = Object.assign(Object.create(Channel.prototype), {
            [id]: channelId,
            capacity: (_b = obj.capacity) !== null && _b !== void 0 ? _b : 0,
            buffer: [],
            producers: [],
            consumers: [],
            error: null,
            state: 1,
        });
    }
    wireChannel(channel, channelWrite);
    return channel;
}

export { IsPath, handleChannelMessage, isBun, isChannelMessage, isDeno, isMainThread, isNode, isNodePrior14, resolveModule, unwrapChannel, wrapChannel };
//# sourceMappingURL=util.js.map
