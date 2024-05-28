import { deepStrictEqual, strictEqual } from "node:assert";
import { Buffer } from "node:buffer";
import bytes from "./bytes.ts";
import hash, { sha1, sha256, sha512, md5 } from "./hash.ts";

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
});
