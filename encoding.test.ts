import { deepStrictEqual, strictEqual } from "node:assert";
import { Buffer } from "node:buffer";
import { decodeBase64, decodeHex, encodeBase64, encodeHex } from "./encoding.ts";
import bytes, { text } from "./bytes.ts";
import { random } from "./string.ts";

const chars1 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~!@#$%^&*()[]{}_-+/='\";:,.<>?";
const chars2 = "的一国在人了有中是年和大业不为发会工经上地市要个产这出行作生家以成到日民来我部对进多全建他公开们场展时理新方主企资实学报制政济用同于法高长现本月定化加动合品重关机分力自外者区能设后就等体下万元社过前面";
const chars = chars1 + chars2;

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

        for (let i = 0; i < 100; i++) {
            const original = random(16, chars);
            const hex = encodeHex(original);

            strictEqual(hex, Buffer.from(original).toString("hex"));
        }
    });

    it("decodeHex", () => {
        const data1 = decodeHex("48656c6c6f2c20576f726c6421");
        deepStrictEqual(data1, new Uint8Array(bytes("Hello, World!")));

        const data2 = decodeHex("e4bda0e5a5bdefbc8ce4b896e7958cefbc81");
        deepStrictEqual(data2, new Uint8Array(bytes("你好，世界！")));

        for (let i = 0; i < 100; i++) {
            const original = random(16, chars);
            const hex = encodeHex(original);
            const decoded = text(decodeHex(hex));

            strictEqual(decoded, original);
        }
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

        for (let i = 0; i < 100; i++) {
            const original = random(16, chars);
            const base64 = encodeBase64(original);

            strictEqual(base64, Buffer.from(original).toString("base64"));
        }
    });

    it("decodeBase64", () => {
        const data1 = decodeBase64("SGVsbG8sIFdvcmxkIQ==");
        deepStrictEqual(data1, new Uint8Array(bytes("Hello, World!")));

        const data2 = decodeBase64("5L2g5aW977yM5LiW55WM77yB");
        deepStrictEqual(data2, new Uint8Array(bytes("你好，世界！")));

        for (let i = 0; i < 100; i++) {
            const original = random(16, chars);
            const base64 = encodeBase64(original);
            const decoded = text(decodeBase64(base64));

            strictEqual(decoded, original);
        }
    });
});
