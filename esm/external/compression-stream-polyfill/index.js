import { createGzip, createDeflate, createDeflateRaw, createGunzip, createInflate, createInflateRaw } from 'node:zlib';

function throwUnsupportedFormatError(format) {
    throw new TypeError(`Unsupported format: ${format}`);
}
if (typeof CompressionStream === "undefined") {
    globalThis.CompressionStream = class CompressionStream {
        constructor(format) {
            let impl;
            if (format === "gzip") {
                impl = createGzip();
            }
            else if (format === "deflate") {
                impl = createDeflate();
            }
            else if (format === "deflate-raw") {
                impl = createDeflateRaw();
            }
            else {
                throwUnsupportedFormatError(format);
            }
            this.readable = new ReadableStream({
                start(controller) {
                    impl.on("data", (chunk) => controller.enqueue(chunk));
                    impl.once("error", (err) => controller.error(err));
                    impl.once("close", () => controller.close());
                },
            });
            this.writable = new WritableStream({
                start(controller) {
                    impl.once("error", (err) => controller.error(err));
                    impl.once("close", () => controller.error());
                },
                write(chunk) {
                    impl.write(chunk);
                },
                close() {
                    impl.end();
                },
                abort(reason) {
                    impl.destroy(reason);
                },
            });
        }
    };
}
if (typeof DecompressionStream === "undefined") {
    globalThis.DecompressionStream = class DecompressionStream {
        constructor(format) {
            let impl;
            if (format === "gzip") {
                impl = createGunzip();
            }
            else if (format === "deflate") {
                impl = createInflate();
            }
            else if (format === "deflate-raw") {
                impl = createInflateRaw();
            }
            else {
                throwUnsupportedFormatError(format);
            }
            this.readable = new ReadableStream({
                start(controller) {
                    impl.on("data", (chunk) => controller.enqueue(chunk));
                    impl.once("error", (err) => controller.error(err));
                    impl.once("close", () => controller.close());
                },
            });
            this.writable = new WritableStream({
                start(controller) {
                    impl.once("error", (err) => controller.error(err));
                    impl.once("close", () => controller.error());
                },
                write(chunk) {
                    impl.write(chunk);
                },
                close() {
                    impl.end();
                },
                abort(reason) {
                    impl.destroy(reason);
                },
            });
        }
    };
}
//# sourceMappingURL=index.js.map
