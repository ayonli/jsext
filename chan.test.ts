import { deepStrictEqual, strictEqual } from "node:assert";
import { sleep } from "./async.ts";
import { random, range } from "./number.ts";
import { sum } from "./math.ts";
import jsext from "./index.ts";
import { try_ } from "./result.ts";

describe("jsext.chan", () => {
    it("non-buffered channel", async () => {
        const channel = jsext.chan<number>();

        (async () => {
            await channel.send(123);
        })();

        const num = await channel.recv();
        strictEqual(num, 123);
    });

    it("buffered channel", async () => {
        const channel = jsext.chan<number>(4);

        (async () => {
            await sleep(random(1, 5));
            await channel.send(1);
        })();

        (async () => {
            await sleep(random(1, 5));
            await channel.send(2);
        })();

        (async () => {
            await sleep(random(1, 5));
            await channel.send(3);
        })();

        (async () => {
            await sleep(random(1, 5));
            await channel.send(4);
        })();

        await sleep(random(1, 5));
        const numbers = await Promise.all([
            channel.recv(),
            channel.recv(),
            channel.recv(),
            channel.recv(),
        ]) as number[];

        strictEqual(sum(...numbers), 10);
    });

    it("iterable", async () => {
        const channel = jsext.chan<number>();

        (async () => {
            for (const num of range(0, 9)) {
                await channel.send(num);
            }

            channel.close();
        })();

        const numbers: number[] = [];

        for await (const num of channel) {
            numbers.push(num);
        }

        deepStrictEqual(numbers, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it("message queue", async () => {
        const channel = jsext.chan<number>(Infinity);

        (async () => {
            for (const num of range(0, 9)) {
                await channel.send(num);
            }

            channel.close();
        })();

        const numbers: number[] = [];

        for await (const num of channel) {
            numbers.push(num);
        }

        deepStrictEqual(numbers, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it("error", async () => {
        const channel = jsext.chan<number>();

        (async () => {
            channel.close(new Error("something went wrong"));
        })();

        const result = await try_(channel.recv());
        strictEqual(result.ok, false);
        deepStrictEqual(result.error, new Error("something went wrong"));
        strictEqual(result.value, undefined);

        const val = await channel.recv();
        strictEqual(val, undefined);
    });
});
