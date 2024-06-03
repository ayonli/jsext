const SSEMarkClosed = new Set<string>();
const _lastEventId = Symbol.for("lastEventId");
const _closed = Symbol.for("closed");
const _response = Symbol.for("response");
const _writer = Symbol.for("writer");
const _reader = Symbol.for("reader");
const _closureHandler = Symbol.for("closureHandler");

export class SSE {
    private [_writer]: WritableStreamDefaultWriter<string>;
    private [_reader]: ReadableStreamDefaultReader<string>;
    private [_closureHandler]: (() => void) | undefined;
    private [_lastEventId]: string | undefined;
    private [_closed]: boolean = false;
    private [_response]: Response | undefined;

    constructor(req: Request, private retry: number = 0) {
        this[_lastEventId] = req.headers.get("Last-Event-ID") ?? undefined;
        this[_closed] = this.lastEventId ? SSEMarkClosed.has(this.lastEventId) : false;

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const _this = this;
        const { writable, readable } = new TransformStream();

        this[_writer] = writable.getWriter();
        const reader = this[_reader] = readable.getReader();

        const _readable = new ReadableStream<string>({
            async start(controller) {
                controller.enqueue("");
            },
            async pull(controller) {
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        break;
                    }

                    controller.enqueue(value);
                }
            },
            async cancel(reason) {
                _this[_closureHandler]?.();
                reader.cancel(reason);
            }
        });

        this[_response] = new Response(_readable, {
            status: this.closed ? 204 : 200,
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });

        this.closed && this.close();
    }

    get lastEventId() {
        return this[_lastEventId];
    }

    get closed() {
        return this[_closed];
    }

    get response() {
        return this[_response]!;
    }

    async send(data: any, eventId: string | undefined = undefined) {
        let frames: string[];

        if (data === undefined) {
            frames = [""];
        } else if (typeof data !== "string") {
            frames = [JSON.stringify(data)];
        } else {
            frames = data.split(/\r\n|\r/);
        }

        this[_lastEventId] = eventId;
        const writer = this[_writer];

        await writer.write(`id: ${eventId}\n`);

        if (this.retry) {
            await writer.write(`retry: ${this.retry}\n`);
        }

        for (const frame of frames) {
            await writer.write(`data: ${frame}\n`);
        }

        await writer.write("\n");
    }

    async emit(event: string, data: any, eventId: string | undefined = undefined) {
        eventId ??= Math.random().toString(16).slice(2);
        await this[_writer].write(`event: ${event}\n`);
        return this.send(data, eventId);
    }

    async close() {
        const reader = this[_reader];

        if (this.lastEventId) {
            if (!SSEMarkClosed.has(this.lastEventId)) {
                SSEMarkClosed.add(this.lastEventId);
                reader.cancel();
            } else {
                SSEMarkClosed.delete(this.lastEventId);
            }
        } else {
            reader.cancel();
        }
    }

    onClose(cb: () => void) {
        this[_closureHandler] = cb;
    }
}
