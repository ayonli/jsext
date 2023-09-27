import { deepStrictEqual, strictEqual } from "node:assert";
import { sleep } from "./promise/index.ts";
import { random, sequence } from "./number/index.ts";
import { sum } from "./math/index.ts";
import jsext from "./index.ts";

describe("jsext.chan", () => {
    it("non-buffered channel", async () => {
        const channel = jsext.chan<number>();

        (async () => {
            await channel.push(123);
        })();

        const num = await channel.pop();
        strictEqual(num, 123);
    });

    it("buffered channel", async () => {
        const channel = jsext.chan<number>(4);

        (async () => {
            await sleep(random(1, 5));
            await channel.push(1);
        })();

        (async () => {
            await sleep(random(1, 5));
            await channel.push(2);
        })();

        (async () => {
            await sleep(random(1, 5));
            await channel.push(3);
        })();

        (async () => {
            await sleep(random(1, 5));
            await channel.push(4);
        })();

        await sleep(random(1, 5));
        const numbers = await Promise.all([
            channel.pop(),
            channel.pop(),
            channel.pop(),
            channel.pop(),
        ]) as number[];

        strictEqual(sum(...numbers), 10);
    });

    it("iterable", async () => {
        const channel = jsext.chan<number>();

        (async () => {
            for (const num of sequence(0, 9)) {
                await channel.push(num);
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
            for (const num of sequence(0, 9)) {
                await channel.push(num);
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

        const [err, res] = await jsext.try(channel.pop());
        deepStrictEqual(err, new Error("something went wrong"));
        strictEqual(res, undefined);

        const val = await channel.pop();
        strictEqual(val, undefined);
    });
});
