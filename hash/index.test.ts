import { deepStrictEqual, strictEqual } from "node:assert";
import { Buffer } from "node:buffer";
import { createHmac } from "node:crypto";
import bytes from "@jsext/bytes";
import hash, { adler32, crc32, sha1, sha256, sha512, md5, hmac } from "./index.ts";

describe("hash", () => {
    describe("hash", () => {
        it("string", () => {
            strictEqual(hash("hello world"), 2616892229);
        });

        it("ArrayBuffer", () => {
            strictEqual(hash(bytes("hello world").buffer), 2616892229);
        });

        it("Uint8Array", () => {
            strictEqual(hash(bytes("hello world")), 2616892229);
        });
    });

    describe("adler32", () => {
        it("string", () => {
            strictEqual(adler32("Hello, World!"), 530449514);
            strictEqual(adler32("World!", adler32("Hello, ")), 530449514);
        });

        it("ArrayBuffer", () => {
            strictEqual(adler32(bytes("Hello, World!").buffer), 530449514);
            strictEqual(adler32(new Uint8Array([1, 2, 3]).buffer), 851975);
        });

        it("Uint8Array", () => {
            strictEqual(adler32(bytes("Hello, World!")), 530449514);
            strictEqual(adler32(new Uint8Array([1, 2, 3])), 851975);
        });
    });

    describe("crc32", () => {
        it("string", () => {
            strictEqual(crc32("Hello, World!"), 3964322768);
            strictEqual(crc32("World!", crc32("Hello, ")), 3964322768);
        });

        it("ArrayBuffer", () => {
            strictEqual(crc32(bytes("Hello, World!").buffer), 3964322768);
            strictEqual(crc32(new Uint8Array([1, 2, 3]).buffer), 1438416925);
        });

        it("Uint8Array", () => {
            strictEqual(crc32(bytes("Hello, World!")), 3964322768);
            strictEqual(crc32(new Uint8Array([1, 2, 3])), 1438416925);
        });
    });

    describe("sha1", () => {
        const hex = "2aae6c35c94fcfb415dbe95f408b9ce91ee846ed";
        const base64 = "Kq5sNclPz7QV2+lfQIuc6R7oRu0=";
        const buf = Buffer.alloc(20);
        buf.write(hex, "hex");
        const buffer = buf.buffer;

        it("string", async () => {
            deepStrictEqual(await sha1("hello world"), buffer);
            strictEqual(await sha1("hello world", "hex"), hex);
            strictEqual(await sha1("hello world", "base64"), base64);
        });

        it("ArrayBuffer", async () => {
            deepStrictEqual(await sha1(bytes("hello world").buffer), buffer);
            strictEqual(await sha1(bytes("hello world").buffer, "hex"), hex);
            strictEqual(await sha1(bytes("hello world").buffer, "base64"), base64);
        });

        it("Uint8Array", async () => {
            deepStrictEqual(await sha1(bytes("hello world")), buffer);
            strictEqual(await sha1(bytes("hello world"), "hex"), hex);
            strictEqual(await sha1(bytes("hello world"), "base64"), base64);
        });

        it("ReadableStream", async function () {
            if (typeof ReadableStream === "undefined") {
                this.skip();
            }

            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(bytes("hello world"));
                    controller.close();
                }
            });
            const [copy1, copy2] = stream.tee();
            const [copy3, copy4] = copy2.tee();

            deepStrictEqual(await sha1(copy1), buffer);
            strictEqual(await sha1(copy3, "hex"), hex);
            strictEqual(await sha1(copy4, "base64"), base64);
        });

        it("Blob", async function () {
            if (typeof Blob === "undefined") {
                this.skip();
            }

            const blob = new Blob([bytes("hello world")]);

            deepStrictEqual(await sha1(blob), buffer);
            strictEqual(await sha1(blob, "hex"), hex);
            strictEqual(await sha1(blob, "base64"), base64);
        });
    });

    describe("sha256", () => {
        const hex = "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9";
        const base64 = "uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek=";
        const buf = Buffer.alloc(32);
        buf.write(hex, "hex");
        const buffer = buf.buffer;

        it("string", async () => {
            deepStrictEqual(await sha256("hello world"), buffer);
            strictEqual(await sha256("hello world", "hex"), hex);
            strictEqual(await sha256("hello world", "base64"), base64);
        });

        it("ArrayBuffer", async () => {
            deepStrictEqual(await sha256(bytes("hello world").buffer), buffer);
            strictEqual(await sha256(bytes("hello world").buffer, "hex"), hex);
            strictEqual(await sha256(bytes("hello world").buffer, "base64"), base64);
        });

        it("Uint8Array", async () => {
            deepStrictEqual(await sha256(bytes("hello world")), buffer);
            strictEqual(await sha256(bytes("hello world"), "hex"), hex);
            strictEqual(await sha256(bytes("hello world"), "base64"), base64);
        });

        it("ReadableStream", async function () {
            if (typeof ReadableStream === "undefined") {
                this.skip();
            }

            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(bytes("hello world"));
                    controller.close();
                }
            });
            const [copy1, copy2] = stream.tee();
            const [copy3, copy4] = copy2.tee();

            deepStrictEqual(await sha256(copy1), buffer);
            strictEqual(await sha256(copy3, "hex"), hex);
            strictEqual(await sha256(copy4, "base64"), base64);
        });

        it("Blob", async function () {
            if (typeof Blob === "undefined") {
                this.skip();
            }

            const blob = new Blob([bytes("hello world")]);

            deepStrictEqual(await sha256(blob), buffer);
            strictEqual(await sha256(blob, "hex"), hex);
            strictEqual(await sha256(blob, "base64"), base64);
        });
    });

    describe("sha512", () => {
        const hex = "309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f";
        const base64 = "MJ7MSJwS1utMxA9QyQLytNDtd+5RGnx6m808qG1M2G+YndNbxf9JlnDaNCVbRbDP2DDoH2Bdz33FVC6TrpzXbw==";
        const buf = Buffer.alloc(64);
        buf.write(hex, "hex");
        const buffer = buf.buffer;

        it("string", async () => {
            deepStrictEqual(await sha512("hello world"), buffer);
            strictEqual(await sha512("hello world", "hex"), hex);
            strictEqual(await sha512("hello world", "base64"), base64);
        });

        it("ArrayBuffer", async () => {
            deepStrictEqual(await sha512(bytes("hello world").buffer), buffer);
            strictEqual(await sha512(bytes("hello world").buffer, "hex"), hex);
            strictEqual(await sha512(bytes("hello world").buffer, "base64"), base64);
        });

        it("Uint8Array", async () => {
            deepStrictEqual(await sha512(bytes("hello world")), buffer);
            strictEqual(await sha512(bytes("hello world"), "hex"), hex);
            strictEqual(await sha512(bytes("hello world"), "base64"), base64);
        });

        it("ReadableStream", async function () {
            if (typeof ReadableStream === "undefined") {
                this.skip();
            }

            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(bytes("hello world"));
                    controller.close();
                }
            });
            const [copy1, copy2] = stream.tee();
            const [copy3, copy4] = copy2.tee();

            deepStrictEqual(await sha512(copy1), buffer);
            strictEqual(await sha512(copy3, "hex"), hex);
            strictEqual(await sha512(copy4, "base64"), base64);
        });

        it("Blob", async function () {
            if (typeof Blob === "undefined") {
                this.skip();
            }

            const blob = new Blob([bytes("hello world")]);

            deepStrictEqual(await sha512(blob), buffer);
            strictEqual(await sha512(blob, "hex"), hex);
            strictEqual(await sha512(blob, "base64"), base64);
        });
    });

    describe("md5", () => {
        const hex = "5eb63bbbe01eeed093cb22bb8f5acdc3";
        const base64 = "XrY7u+Ae7tCTyyK7j1rNww==";
        const buf = Buffer.alloc(16);
        buf.write(hex, "hex");
        const buffer = buf.buffer;

        it("string", async () => {
            deepStrictEqual(await md5("hello world"), buffer);
            strictEqual(await md5("hello world", "hex"), hex);
            strictEqual(await md5("hello world", "base64"), base64);
        });

        it("ArrayBuffer", async () => {
            deepStrictEqual(await md5(bytes("hello world").buffer), buffer);
            strictEqual(await md5(bytes("hello world").buffer, "hex"), hex);
            strictEqual(await md5(bytes("hello world").buffer, "base64"), base64);
        });

        it("Uint8Array", async () => {
            deepStrictEqual(await md5(bytes("hello world")), buffer);
            strictEqual(await md5(bytes("hello world"), "hex"), hex);
            strictEqual(await md5(bytes("hello world"), "base64"), base64);
        });

        it("ReadableStream", async function () {
            if (typeof ReadableStream === "undefined") {
                this.skip();
            }

            const stream = new ReadableStream({
                start(controller) {
                    controller.enqueue(bytes("hello world"));
                    controller.close();
                }
            });
            const [copy1, copy2] = stream.tee();
            const [copy3, copy4] = copy2.tee();

            deepStrictEqual(await md5(copy1), buffer);
            strictEqual(await md5(copy3, "hex"), hex);
            strictEqual(await md5(copy4, "base64"), base64);
        });

        it("Blob", async function () {
            if (typeof Blob === "undefined") {
                this.skip();
            }

            const blob = new Blob([bytes("hello world")]);

            deepStrictEqual(await md5(blob), buffer);
            strictEqual(await md5(blob, "hex"), hex);
            strictEqual(await md5(blob, "base64"), base64);
        });
    });

    describe("hmac", () => {
        describe("hmac:sha1", () => {
            const buf = createHmac("sha1", bytes("key")).update(bytes("hello world")).digest();
            const buffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
            const hex = buf.toString("hex");
            const base64 = buf.toString("base64");

            it("string", async () => {
                const hash1 = await hmac("sha1", "key", "hello world");
                deepStrictEqual(hash1, buffer);

                const hash2 = await hmac("sha1", "key", "hello world", "hex");
                strictEqual(hash2, hex);

                const hash3 = await hmac("sha1", "key", "hello world", "base64");
                strictEqual(hash3, base64);
            });

            it("ArrayBuffer", async () => {
                const key = bytes("key").buffer;
                const data = bytes("hello world").buffer;

                const hash1 = await hmac("sha1", key, data);
                deepStrictEqual(hash1, buffer);

                const hash2 = await hmac("sha1", key, data, "hex");
                strictEqual(hash2, hex);

                const hash3 = await hmac("sha1", key, data, "base64");
                strictEqual(hash3, base64);
            });

            it("Uint8Array", async () => {
                const key = bytes("key");
                const data = bytes("hello world");

                const hash1 = await hmac("sha1", key, data);
                deepStrictEqual(hash1, buffer);

                const hash2 = await hmac("sha1", key, data, "hex");
                strictEqual(hash2, hex);

                const hash3 = await hmac("sha1", key, data, "base64");
                strictEqual(hash3, base64);
            });

            it("ReadableStream", async function () {
                if (typeof ReadableStream === "undefined") {
                    this.skip();
                }

                const stream = new ReadableStream({
                    start(controller) {
                        controller.enqueue(bytes("hello world"));
                        controller.close();
                    }
                });
                const [copy1, copy2] = stream.tee();
                const [copy3, copy4] = copy2.tee();

                const key = bytes("key");

                const hash1 = await hmac("sha1", key, copy1);
                deepStrictEqual(hash1, buffer);

                const hash2 = await hmac("sha1", key, copy3, "hex");
                strictEqual(hash2, hex);

                const hash3 = await hmac("sha1", key, copy4, "base64");
                strictEqual(hash3, base64);
            });

            it("Blob", async function () {
                if (typeof Blob === "undefined") {
                    this.skip();
                }

                const key = bytes("key");
                const data = new Blob([bytes("hello world")]);

                const hash1 = await hmac("sha1", key, data);
                deepStrictEqual(hash1, buffer);

                const hash2 = await hmac("sha1", key, data, "hex");
                strictEqual(hash2, hex);

                const hash3 = await hmac("sha1", key, data, "base64");
                strictEqual(hash3, base64);
            });
        });

        describe("hmac:sha256", () => {
            const buf = createHmac("sha256", bytes("key")).update(bytes("hello world")).digest();
            const buffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
            const hex = buf.toString("hex");
            const base64 = buf.toString("base64");

            it("string", async () => {
                const hash1 = await hmac("sha256", "key", "hello world");
                deepStrictEqual(hash1, buffer);

                const hash2 = await hmac("sha256", "key", "hello world", "hex");
                strictEqual(hash2, hex);

                const hash3 = await hmac("sha256", "key", "hello world", "base64");
                strictEqual(hash3, base64);
            });

            it("ArrayBuffer", async () => {
                const key = bytes("key").buffer;
                const data = bytes("hello world").buffer;

                const hash1 = await hmac("sha256", key, data);
                deepStrictEqual(hash1, buffer);

                const hash2 = await hmac("sha256", key, data, "hex");
                strictEqual(hash2, hex);

                const hash3 = await hmac("sha256", key, data, "base64");
                strictEqual(hash3, base64);
            });

            it("Uint8Array", async () => {
                const key = bytes("key");
                const data = bytes("hello world");

                const hash1 = await hmac("sha256", key, data);
                deepStrictEqual(hash1, buffer);

                const hash2 = await hmac("sha256", key, data, "hex");
                strictEqual(hash2, hex);

                const hash3 = await hmac("sha256", key, data, "base64");
                strictEqual(hash3, base64);
            });

            it("ReadableStream", async function () {
                if (typeof ReadableStream === "undefined") {
                    this.skip();
                }

                const stream = new ReadableStream({
                    start(controller) {
                        controller.enqueue(bytes("hello world"));
                        controller.close();
                    }
                });
                const [copy1, copy2] = stream.tee();
                const [copy3, copy4] = copy2.tee();

                const key = bytes("key");

                const hash1 = await hmac("sha256", key, copy1);
                deepStrictEqual(hash1, buffer);

                const hash2 = await hmac("sha256", key, copy3, "hex");
                strictEqual(hash2, hex);

                const hash3 = await hmac("sha256", key, copy4, "base64");
                strictEqual(hash3, base64);
            });

            it("Blob", async function () {
                if (typeof Blob === "undefined") {
                    this.skip();
                }

                const key = bytes("key");
                const data = new Blob([bytes("hello world")]);

                const hash1 = await hmac("sha256", key, data);
                deepStrictEqual(hash1, buffer);

                const hash2 = await hmac("sha256", key, data, "hex");
                strictEqual(hash2, hex);

                const hash3 = await hmac("sha256", key, data, "base64");
                strictEqual(hash3, base64);
            });
        });

        describe("hmac:sha512", () => {
            const buf = createHmac("sha512", bytes("key")).update(bytes("hello world")).digest();
            const buffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
            const hex = buf.toString("hex");
            const base64 = buf.toString("base64");

            it("string", async () => {
                const hash1 = await hmac("sha512", "key", "hello world");
                deepStrictEqual(hash1, buffer);

                const hash2 = await hmac("sha512", "key", "hello world", "hex");
                strictEqual(hash2, hex);

                const hash3 = await hmac("sha512", "key", "hello world", "base64");
                strictEqual(hash3, base64);
            });

            it("ArrayBuffer", async () => {
                const key = bytes("key").buffer;
                const data = bytes("hello world").buffer;

                const hash1 = await hmac("sha512", key, data);
                deepStrictEqual(hash1, buffer);

                const hash2 = await hmac("sha512", key, data, "hex");
                strictEqual(hash2, hex);

                const hash3 = await hmac("sha512", key, data, "base64");
                strictEqual(hash3, base64);
            });

            it("Uint8Array", async () => {
                const key = bytes("key");
                const data = bytes("hello world");

                const hash1 = await hmac("sha512", key, data);
                deepStrictEqual(hash1, buffer);

                const hash2 = await hmac("sha512", key, data, "hex");
                strictEqual(hash2, hex);

                const hash3 = await hmac("sha512", key, data, "base64");
                strictEqual(hash3, base64);
            });

            it("ReadableStream", async function () {
                if (typeof ReadableStream === "undefined") {
                    this.skip();
                }

                const stream = new ReadableStream({
                    start(controller) {
                        controller.enqueue(bytes("hello world"));
                        controller.close();
                    }
                });
                const [copy1, copy2] = stream.tee();
                const [copy3, copy4] = copy2.tee();

                const key = bytes("key");

                const hash1 = await hmac("sha512", key, copy1);
                deepStrictEqual(hash1, buffer);

                const hash2 = await hmac("sha512", key, copy3, "hex");
                strictEqual(hash2, hex);

                const hash3 = await hmac("sha512", key, copy4, "base64");
                strictEqual(hash3, base64);
            });

            it("Blob", async function () {
                if (typeof Blob === "undefined") {
                    this.skip();
                }

                const key = bytes("key");
                const data = new Blob([bytes("hello world")]);

                const hash1 = await hmac("sha512", key, data);
                deepStrictEqual(hash1, buffer);

                const hash2 = await hmac("sha512", key, data, "hex");
                strictEqual(hash2, hex);

                const hash3 = await hmac("sha512", key, data, "base64");
                strictEqual(hash3, base64);
            });
        });
    });
});
