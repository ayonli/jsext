import { deepStrictEqual, strictEqual } from "node:assert";
import { Buffer } from "node:buffer";
import { decodeHex, encodeBase64, encodeHex } from "./encoding.ts";
import bytes from "./bytes.ts";

describe("encoding", () => {
    it("encodeHex", () => {
        const hex1 = encodeHex("Hello, World!");
        strictEqual(hex1, "48656c6c6f2c20576f726c6421");
        strictEqual(hex1, Buffer.from("Hello, World!").toString("hex"));

        const hex2 = encodeHex(bytes("Hello, World!"));
        strictEqual(hex2, "48656c6c6f2c20576f726c6421");
        strictEqual(hex2, Buffer.from("Hello, World!").toString("hex"));

        const hex3 = encodeHex(bytes("Hello, World!").buffer);
        strictEqual(hex3, "48656c6c6f2c20576f726c6421");
        strictEqual(hex3, Buffer.from("Hello, World!").toString("hex"));

        const hex4 = encodeHex("你好，世界！");
        strictEqual(hex4, "e4bda0e5a5bdefbc8ce4b896e7958cefbc81");
        strictEqual(hex4, Buffer.from("你好，世界！").toString("hex"));
    });

    it("decodeHex", () => {
        const data1 = decodeHex("48656c6c6f2c20576f726c6421");
        deepStrictEqual(data1, new Uint8Array(bytes("Hello, World!")));

        const data2 = decodeHex("e4bda0e5a5bdefbc8ce4b896e7958cefbc81");
        deepStrictEqual(data2, new Uint8Array(bytes("你好，世界！")));
    });

    it("encodeBase64", () => {
        const base641 = encodeBase64("Hello, World!");
        strictEqual(base641, "SGVsbG8sIFdvcmxkIQ==");
        strictEqual(base641, Buffer.from("Hello, World!").toString("base64"));

        const base642 = encodeBase64(bytes("Hello, World!"));
        strictEqual(base642, "SGVsbG8sIFdvcmxkIQ==");
        strictEqual(base642, Buffer.from("Hello, World!").toString("base64"));

        const base643 = encodeBase64(bytes("Hello, World!").buffer);
        strictEqual(base643, "SGVsbG8sIFdvcmxkIQ==");
        strictEqual(base643, Buffer.from("Hello, World!").toString("base64"));

        const base644 = encodeBase64("你好，世界！");
        strictEqual(base644, "5L2g5aW977yM5LiW55WM77yB");
        strictEqual(base644, Buffer.from("你好，世界！").toString("base64"));
    });
});
