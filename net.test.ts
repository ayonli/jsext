import { strictEqual } from "node:assert";
import bytes from "./bytes.ts";
import { connect, randomPort } from "./net.ts";
import { parseResponse } from "./http.ts";
import { readAsText } from "./reader.ts";
import _try from "./try.ts";
import func from "./func.ts";
import { isDeno } from "./env.ts";

describe("net", () => {
    describe("connect", () => {
        if (typeof ReadableStream === "undefined") {
            return;
        }

        it("connect and half close (close the writable stream)", async () => {
            const socket = await connect({ hostname: "example.com", port: 80 });
            const writer = socket.writable.getWriter();

            await writer.write(bytes("GET / HTTP/1.1\r\n"));
            await writer.write(bytes("Accept: plain/html\r\n"));
            await writer.write(bytes("Host: example.com\r\n"));
            await writer.write(bytes("\r\n"));
            await writer.close();

            const result = await readAsText(socket.readable);
            const res = parseResponse(result);
            const text = await res.text();

            strictEqual(res.ok, true);
            strictEqual(text.match(/Example Domain/)?.[0], "Example Domain");
            strictEqual(await socket.closed, undefined);
        });

        it("close socket", async () => {
            const socket = await connect({ hostname: "example.com", port: 80 });
            const writer = socket.writable.getWriter();

            await writer.write(bytes("GET / HTTP/1.1\r\n"));
            await writer.write(bytes("Accept: plain/html\r\n"));
            await writer.write(bytes("Host: example.com\r\n"));
            await writer.write(bytes("\r\n"));
            await socket.close();

            strictEqual(await socket.closed, undefined);
        });

        it("close the readable stream (no reason)", async () => {
            const socket = await connect({ hostname: "example.com", port: 80 });
            const writer = socket.writable.getWriter();

            await writer.write(bytes("GET / HTTP/1.1\r\n"));
            await writer.write(bytes("Accept: plain/html\r\n"));
            await writer.write(bytes("Host: example.com\r\n"));
            await writer.write(bytes("\r\n"));

            await socket.readable.cancel();
            strictEqual(await socket.closed, undefined);
        });

        it("close the readable stream (with reason)", async () => {
            const socket = await connect({ hostname: "example.com", port: 80 });
            const writer = socket.writable.getWriter();

            await writer.write(bytes("GET / HTTP/1.1\r\n"));
            await writer.write(bytes("Accept: plain/html\r\n"));
            await writer.write(bytes("Host: example.com\r\n"));
            await writer.write(bytes("\r\n"));

            await socket.readable.cancel(new Error("User canceled"));
            const [err] = await _try(socket.closed);

            strictEqual(String(err), "Error: User canceled");
        });

        it("close by server", func(async (defer) => {
            const { createServer } = await import("node:net");
            const server = createServer((socket) => {
                setTimeout(() => {
                    socket.destroy();
                }, 50);
            });
            defer(() => server.close());

            const port = await randomPort();
            await new Promise<void>(resolve => {
                server.listen(port, "127.0.0.1");
                server.once("listening", resolve);
            });

            const socket = await connect({ hostname: "127.0.0.1", port });
            const [err, res] = await _try(socket.closed);
            strictEqual(err, null);
            strictEqual(res, undefined);
        }));

        it("TLS support", async function () {
            if (!isDeno) {
                this.skip(); // TODO: Currently only Deno successfully passes this test
            }

            const socket = await connect({ hostname: "example.com", port: 443, tls: true });
            const writer = socket.writable.getWriter();

            await writer.write(bytes("GET / HTTP/1.1\r\n"));
            await writer.write(bytes("Accept: plain/html\r\n"));
            await writer.write(bytes("Host: example.com\r\n"));
            await writer.write(bytes("\r\n"));
            await writer.close();

            const result = await readAsText(socket.readable);
            const res = parseResponse(result);
            const text = await res.text();

            strictEqual(res.ok, true);
            strictEqual(text.match(/Example Domain/)?.[0], "Example Domain");
            strictEqual(await socket.closed, undefined);
        });
    });
});
