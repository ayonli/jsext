import { Channel } from '../chan.js';
import { isMainThread, id } from '../env.js';

const channelStore = new Map();
function isChannelMessage(msg) {
    return msg
        && typeof msg === "object"
        && ["send", "close"].includes(msg.type)
        && typeof msg.channelId === "number";
}
async function handleChannelMessage(msg) {
    const record = channelStore.get(msg.channelId);
    if (!record)
        return;
    if (msg.type === "send") {
        await record.raw.send(msg.value);
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
        const send = channel.send.bind(channel);
        const close = channel.close.bind(channel);
        channelStore.set(channelId, {
            channel,
            raw: { send, close },
            writers: [channelWrite],
            counter: 0,
        });
        Object.defineProperties(channel, {
            send: {
                configurable: true,
                writable: true,
                value: async (data) => {
                    const record = channelStore.get(channelId);
                    if (record) {
                        const channel = record.channel;
                        if (channel["state"] !== 1) {
                            throw new TypeError("the channel is closed");
                        }
                        const write = record.writers[record.counter++ % record.writers.length];
                        await Promise.resolve(write("send", data, channelId));
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
                            send: {
                                configurable: true,
                                writable: true,
                                value: record.raw.send,
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

export { handleChannelMessage, isChannelMessage, unwrapChannel, wrapChannel };
//# sourceMappingURL=channel.js.map
