import { deepStrictEqual, strictEqual } from "node:assert";
import { Buffer } from "node:buffer";
import bytes, { text } from "@jsext/bytes";
import { dedent, random } from "@jsext/string";
import { decodeBase64, decodeHex, encodeBase64, encodeHex } from "./index.ts";

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

        if (typeof atob === "function") {
            let key = dedent`
            -----BEGIN PRIVATE KEY-----
            MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCXKztJRlUf4nRA
            waVKeXjYsFNIowfZSamQ9xXMOqcBEaMd3ooKD6/lBt8XLz606qJyOVI4J/II0eX+
            o1QWNtGTNwxDa67g8R4+dA9S91Eqka1bk6TADyp8poiQC4WA28bs/z2NxrXxkUzL
            LKLOmUVv3/z6noVX68vJiJ7sOv6sxKD5lEKhpV6ZjWmOQHqFlBGQErjSzxTK9OBl
            eukKZTbLFSeZQoTPl/rrIpio/YnWwnd2r3yz3Xbr5xFKT9yZne4UkjAUVX4cnVwj
            0kSDh9kz5jEa6TzT4c699HkXSTO3wj1bTfWDS8R6FeK7Utst8rOaT2YE0ZBmB1kh
            j4zWkmXJAgMBAAECggEADLWfyGtXYNTjPUaKpRZNaLp6ZhL+5+/fh8aeWItd2yMm
            ea5qIKps+W54dzSLqx5HBh93oC0Lll4/XgdRXITDXgM0zr5Q96yOBGYxm6Ibet7A
            moBxS4x63/wIY0P0t37C3M4g2LiqN2Ml97cLAR+1zNAiLtgBEgFLIuiPpADZxKCq
            aaqUbfL1xpjMKFu67bWq0J4YwDUmQ6mIGpQRqfz78U62R6y1U7eyU+45r6Ou8llB
            1Dutang6lFInKyjtfBcf76eJY4UQSgJBObNWTJOU9XEFPOZKsfHAD5+jgHAKuJMX
            pAjJ9NFxRXAPCQE3FC1dhxMf7oBWRUa0JePWz8D+4QKBgQDJOVBZOKdYpBsWeX+H
            bNCF4j44usZUr6hD6McuF1k+V6fXKh5piUABaMmwbs4gOMwZZ5ZQDmnOqUnItPEg
            LJB6Klzv6/5FkoHhdAB39GIgS9d+MsyG9oTqi1bqGrgpxej/Ieg3RH9XzmfU5HAq
            Je0C3cEDRpzf7nt6KBQHVmFXNQKBgQDAUbwl+H39Vm4zbxQ9pWuGLvMCE9t5uhzE
            cD4UbjstlrT55+THt9jDKsoCzyscZbwwpNGMQZPCcExHgBYiUGd+MWklQQl0PQy9
            f/BHCMmogTGbH1RjtfF5LkMX22okxUE2dZdFX0GYTZTB32w2T0XR+28d/4R5MkY0
            zo2b0ihixQKBgQCXG+pBxjCteTc6Tm09hrKlB/xP37rWl77VmHYTH8eN8IeDJgcG
            m+Ir7MQhMWSrf9uNbGPNpLVCU5CsH21ACxdIFo4KQf+FwXq1ksZTTntt42ZlR8Kd
            y3yPIapYTU5lWFEbXxwifNbgWolQr2enzylIUL0EN7/Qzid92aEIzY51zQKBgG1q
            kybvN474q33rxpJEGOags3UNIyMgNdm1Gjy5ckW/pns/6bOO724qXAA5KYfgga8T
            Nn0bmhtXlK5hOzaOlDMBnZaqZ9yQFz2BGozvfPu3dSeSLYsFKrsNDPL3zG3bI/z9
            7fBz/3fNO8MJgCFt/IU5DcD9bLsfVT4Z/gsXCA8ZAoGBAMBqltm418h1J9IqiwRz
            XWdlj9zwgR4ryOaATSlClkgR1Pe01ar5bKtjFSu4Mkp/7WjSD4PZ7LhEUYg2Wdj3
            M1ecoIN75poN4JvzXb7yUXWl0QMg7jlVwJ1G0xaBoKbJrGqBdWMfgeKyjqtVX6vV
            ETsrQcAZ6PqNg0aoJ97wJzPj
            -----END PRIVATE KEY-----
            `.trim();
            const pemHeader = "-----BEGIN PRIVATE KEY-----";
            const pemFooter = "-----END PRIVATE KEY-----";
            key = key.substring(
                pemHeader.length,
                key.length - pemFooter.length - 1,
            );

            const binString = atob(key);
            const size = binString.length;
            const _bytes = new Uint8Array(size);

            for (let i = 0; i < size; i++) {
                _bytes[i] = binString.charCodeAt(i);
            }

            const data3 = decodeBase64(key);
            deepStrictEqual(data3, _bytes);
        }
    });
});
