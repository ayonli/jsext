import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { createServer, isIPv4 } from "node:net";
import * as http from "node:http";
import bytes from "./bytes.ts";
import { connect, getMyIp, randomPort, udpSocket } from "./net.ts";
import { parseResponse } from "./http.ts";
import { readAsText } from "./reader.ts";
import _try from "./try.ts";
import func from "./func.ts";
import { isBun, isDeno } from "./env.ts";
import { platform } from "./runtime.ts";
import { remove } from "./fs.ts";

describe("net", () => {
    it("getMyIp", async () => {
        const ip = await getMyIp();
        ok(isIPv4(ip));
        ok(ip !== "127.0.0.1");
        ok(ip !== "0.0.0.0");
        ok(ip !== "8.8.8.8");
    });

    describe("randomPort", () => {
        it("random port", func(async (defer) => {
            const port = await randomPort();
            ok(port > 0 && port <= 65535);

            if (typeof fetch !== "function") {
                return;
            }

            if (isDeno) {
                const controller = new AbortController();
                Deno.serve({ port, signal: controller.signal }, async () => {
                    return new Response("Hello, World!");
                });
                defer(() => controller.abort());
            } else if (isBun) {
                const server = Bun.serve({
                    port,
                    fetch: async () => {
                        return new Response("Hello, World!");
                    },
                });
                defer(() => server.stop(true));
            } else {
                const server = http.createServer((_req, res) => {
                    res.end("Hello, World!");
                }).listen(port);
                defer(() => server.close());
            }

            const res = await fetch(`http://localhost:${port}`);
            const text = await res.text();

            strictEqual(res.status, 200);
            strictEqual(text, "Hello, World!");
        }));

        it("prefer port", func(async (defer) => {
            const port = await randomPort(32145);
            strictEqual(port, 32145);

            if (typeof fetch !== "function") {
                return;
            }

            if (isDeno) {
                const controller = new AbortController();
                Deno.serve({ port, signal: controller.signal }, async () => {
                    return new Response("Hello, World!");
                });
                defer(() => controller.abort());
            } else if (isBun) {
                const server = Bun.serve({
                    port,
                    fetch: async () => {
                        return new Response("Hello, World!");
                    },
                });
                defer(() => server.stop(true));
            } else {
                const server = http.createServer((_req, res) => {
                    res.end("Hello, World!");
                }).listen(port);
                defer(() => server.close());
            }

            const res = await fetch(`http://localhost:${port}`);
            const text = await res.text();

            strictEqual(res.status, 200);
            strictEqual(text, "Hello, World!");
        }));

        it("prefer port used", func(async (defer) => {
            const server = http.createServer(() => { });
            await new Promise<void>((resolve) => server.listen(32146, () => resolve()));
            defer(() => server.close());

            const port = await randomPort(32146);
            ok(port > 0 && port <= 65535 && port !== 32146);

            if (typeof fetch !== "function") {
                return;
            }

            if (isDeno) {
                const controller = new AbortController();
                Deno.serve({ port, signal: controller.signal }, async () => {
                    return new Response("Hello, World!");
                });
                defer(() => controller.abort());
            } else if (isBun) {
                const server = Bun.serve({
                    port,
                    fetch: async () => {
                        return new Response("Hello, World!");
                    },
                });
                defer(() => server.stop(true));
            } else {
                const server = http.createServer((_req, res) => {
                    res.end("Hello, World!");
                }).listen(port);
                defer(() => server.close());
            }

            const res = await fetch(`http://localhost:${port}`);
            const text = await res.text();

            strictEqual(res.status, 200);
            strictEqual(text, "Hello, World!");
        }));
    });

    describe("connect", () => {
        if (typeof ReadableStream === "undefined") {
            return;
        }

        it("connect and half close (close the writable stream)", async function () {
            this.timeout(5000);
            const socket = await connect({ hostname: "example.com", port: 80 });

            ok(socket.localAddress !== null);
            ok(!!socket.localAddress.hostname);
            ok(socket.localAddress.port > 0);
            ok(socket.remoteAddress !== null);
            ok(!!socket.remoteAddress!.hostname);
            strictEqual(socket.remoteAddress.port, 80);

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

            const [err1, res1] = await _try(socket.readable.getReader().read());
            strictEqual(err1, null);
            deepStrictEqual(res1, { done: true, value: undefined });

            const [err2, res2] = await _try(writer.write(new Uint8Array()));
            ok(String(err2).includes("TypeError") && String(err2).includes("closed"));
            strictEqual(res2, undefined);
        });

        it("close socket (both readable and writable)", async function () {
            this.timeout(5000);
            const socket = await connect({ hostname: "example.com", port: 80 });
            const writer = socket.writable.getWriter();

            await writer.write(bytes("GET / HTTP/1.1\r\n"));
            await writer.write(bytes("Accept: plain/html\r\n"));
            await writer.write(bytes("Host: example.com\r\n"));
            await writer.write(bytes("\r\n"));
            socket.close();

            strictEqual(await socket.closed, undefined);

            const [err1, res1] = await _try(socket.readable.getReader().read());
            strictEqual(err1, null);
            deepStrictEqual(res1, { done: true, value: undefined });

            const [err2, res2] = await _try(writer.write(new Uint8Array()));
            strictEqual(String(err2), "TypeError: The stream is closed.");
            strictEqual(res2, undefined);
        });

        it("close the readable stream (no reason)", async function () {
            this.timeout(5000);
            const socket = await connect({ hostname: "example.com", port: 80 });
            const writer = socket.writable.getWriter();

            await writer.write(bytes("GET / HTTP/1.1\r\n"));
            await writer.write(bytes("Accept: plain/html\r\n"));
            await writer.write(bytes("Host: example.com\r\n"));
            await writer.write(bytes("\r\n"));

            await socket.readable.cancel();
            strictEqual(await socket.closed, undefined);

            const [err1, res1] = await _try(socket.readable.getReader().read());
            strictEqual(err1, null);
            deepStrictEqual(res1, { done: true, value: undefined });

            const [err2, res2] = await _try(writer.write(new Uint8Array()));
            strictEqual(String(err2), "TypeError: The stream is closed.");
            strictEqual(res2, undefined);
        });

        it("close the readable stream (with reason)", async function () {
            this.timeout(5000);
            const socket = await connect({ hostname: "example.com", port: 80 });
            const writer = socket.writable.getWriter();

            await writer.write(bytes("GET / HTTP/1.1\r\n"));
            await writer.write(bytes("Accept: plain/html\r\n"));
            await writer.write(bytes("Host: example.com\r\n"));
            await writer.write(bytes("\r\n"));

            await socket.readable.cancel(new Error("User canceled"));
            const [err] = await _try(socket.closed);
            strictEqual(String(err), "Error: User canceled");

            const [err1, res1] = await _try(socket.readable.getReader().read());
            strictEqual(err1, null);
            deepStrictEqual(res1, { done: true, value: undefined });

            const [err2, res2] = await _try(writer.write(new Uint8Array()));
            strictEqual(String(err2), "TypeError: The stream is closed.");
            strictEqual(res2, undefined);
        });

        it("close by server", func(async (defer) => {
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

            const [err1, res1] = await _try(socket.readable.getReader().read());
            strictEqual(err1, null);
            deepStrictEqual(res1, { done: true, value: undefined });

            const [err2, res2] = await _try(socket.writable.getWriter().write(new Uint8Array()));
            strictEqual(String(err2), "TypeError: The stream is closed.");
            strictEqual(res2, undefined);
        }));

        it("TLS support", async function () {
            if (!isDeno) {
                this.skip(); // TODO: Currently only Deno successfully passes this test
            } else {
                this.timeout(5000);
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

        it("connection error", async () => {
            const port = await randomPort();
            const [err, socket] = await _try(connect({ hostname: "127.0.0.1", port }));
            strictEqual(err instanceof Error, true);
            strictEqual(socket, undefined);
        });

        it("unix socket", func(async function (defer) {
            if (isDeno && platform() === "windows") {
                this.skip(); // TODO: Deno does not support Unix domain socket on Windows
            }

            const path = platform() === "windows"
                ? "\\\\?\\pipe\\test.sock"
                : "/tmp/test.sock";

            if (platform() !== "windows") {
                try {
                    await remove(path);
                } catch { }
            }

            const server = createServer();
            server.listen(path);
            server.on("connection", socket => {
                socket.end("Hello, world!");
            });
            defer(() => server.close());

            const [err, socket] = await _try(connect({ path }));
            strictEqual(err, null);

            const text = await readAsText(socket.readable);
            strictEqual(text, "Hello, world!");
        }));

        it("udp socket", func(async (defer) => {
            const server = await udpSocket({
                hostname: "127.0.0.1",
                port: 0,
            });
            const client = await connect({
                transport: "udp",
                ...server.localAddress,
            });
            defer(() => server.close());
            defer(() => client.close());

            const reader = client.readable.getReader();
            const writer = client.writable.getWriter();

            await writer.write(bytes("Hello, Server!"));
            await writer.close();

            const [clientMsg, clientAddr] = await server.receive();
            deepStrictEqual(clientMsg, new Uint8Array(bytes("Hello, Server!")));

            if (isDeno || isBun) { // Deno and Bun currently don't connect UDP correctly
                strictEqual(clientAddr.port, client.localAddress.port);
            } else {
                deepStrictEqual(clientAddr, client.localAddress);
            }

            await server.send(bytes("Hello, Client!"), clientAddr);

            const { value, done } = await reader.read();
            strictEqual(done, false);
            deepStrictEqual(value, new Uint8Array(bytes("Hello, Client!")));
        }));
    });

    describe("udpSocket", () => {
        if (typeof ReadableStream === "undefined") {
            return;
        }

        it("bind socket", func(async (defer) => {
            const server = await udpSocket({
                hostname: "127.0.0.1",
                port: 0,
            });
            const client = await udpSocket();
            defer(() => server.close());
            defer(() => client.close());

            await client.send(bytes("Hello, Server!"), server.localAddress);

            const [clientMsg, clientAddr] = await server.receive();
            strictEqual(clientAddr.port, client.localAddress.port);
            deepStrictEqual(clientMsg, new Uint8Array(bytes("Hello, Server!")));

            await server.send(bytes("Hello, Client!"), clientAddr);

            const [serverMsg, serverAddr] = await client.receive();
            strictEqual(serverAddr.port, server.localAddress.port);
            deepStrictEqual(serverMsg, new Uint8Array(bytes("Hello, Client!")));
        }));

        it("close socket", async function () {
            const server = await udpSocket({
                hostname: "127.0.0.1",
                port: 0,
            });

            server.close();
            strictEqual(await server.closed, undefined);

            const [err1] = await _try(server.receive());
            strictEqual(String(err1), "TypeError: The socket is closed.");

            const [err2] = await _try(server.send(new Uint8Array(), server.localAddress));
            strictEqual(String(err2), "TypeError: The socket is closed.");
        });

        describe("connection", () => {
            it("connect and half close (close the writable stream)", func(async function (defer) {
                const server = await udpSocket({
                    hostname: "127.0.0.1",
                    port: 0,
                });
                const client = await (await udpSocket({
                    hostname: "127.0.0.1",
                    port: 0,
                })).connect(server.localAddress);
                defer(() => server.close());
                defer(() => client.close());

                const reader = client.readable.getReader();
                const writer = client.writable.getWriter();

                await writer.write(bytes("Hello, Server!"));
                await writer.close();

                const [clientMsg, clientAddr] = await server.receive();
                deepStrictEqual(clientMsg, new Uint8Array(bytes("Hello, Server!")));

                if (isDeno || isBun) { // Deno and Bun currently don't connect UDP correctly
                    strictEqual(clientAddr.port, client.localAddress.port);
                } else {
                    deepStrictEqual(clientAddr, client.localAddress);
                }

                await server.send(bytes("Hello, Client!"), clientAddr);

                const { value, done } = await reader.read();
                strictEqual(done, false);
                deepStrictEqual(value, new Uint8Array(bytes("Hello, Client!")));

                const [err, res] = await _try(writer.write(new Uint8Array()));
                ok(String(err).includes("TypeError") && String(err).includes("closed"));
                strictEqual(res, undefined);
            }));

            it("close socket (both readable and writable)", func(async function (defer) {
                const server = await udpSocket({
                    hostname: "127.0.0.1",
                    port: 0,
                });
                const client = await (await udpSocket({
                    hostname: "127.0.0.1",
                    port: 0,
                })).connect(server.localAddress);
                defer(() => server.close());

                client.close();
                strictEqual(await client.closed, undefined);

                const [err1, res1] = await _try(client.readable.getReader().read());
                strictEqual(err1, null);
                deepStrictEqual(res1, { done: true, value: undefined });

                const [err2, res2] = await _try(client.writable.getWriter().write(new Uint8Array()));
                strictEqual(String(err2), "TypeError: The stream is closed.");
                strictEqual(res2, undefined);
            }));

            it("close the readable stream (no reason)", func(async function (defer) {
                const server = await udpSocket({
                    hostname: "127.0.0.1",
                    port: 0,
                });
                const client = await (await udpSocket({
                    hostname: "127.0.0.1",
                    port: 0,
                })).connect(server.localAddress);
                defer(() => server.close());

                const reader = client.readable.getReader();

                await reader.cancel();
                strictEqual(await client.closed, undefined);

                const [err1, res1] = await _try(reader.read());
                strictEqual(err1, null);
                deepStrictEqual(res1, { done: true, value: undefined });

                const [err2, res2] = await _try(client.writable.getWriter().write(new Uint8Array()));
                strictEqual(String(err2), "TypeError: The stream is closed.");
                strictEqual(res2, undefined);
            }));

            it("close the readable stream (with reason)", func(async function (defer) {
                const server = await udpSocket({
                    hostname: "127.0.0.1",
                    port: 0,
                });
                const client = await (await udpSocket({
                    hostname: "127.0.0.1",
                    port: 0,
                })).connect(server.localAddress);
                defer(() => server.close());

                const reader = client.readable.getReader();

                await reader.cancel(new Error("User canceled"));
                const [err] = await _try(client.closed);
                strictEqual(String(err), "Error: User canceled");

                const [err1, res1] = await _try(reader.read());
                strictEqual(err1, null);
                deepStrictEqual(res1, { done: true, value: undefined });

                const [err2, res2] = await _try(client.writable.getWriter().write(new Uint8Array()));
                strictEqual(String(err2), "TypeError: The stream is closed.");
                strictEqual(res2, undefined);
            }));
        });
    });
});
