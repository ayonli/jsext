import { deepStrictEqual, strictEqual } from "node:assert";
import { sequence } from "./number/index.ts";
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
        const channel = jsext.chan<number>(3);

        await channel.push(123);
        await channel.push(456);
        await channel.push(789);

        const num1 = await channel.pop();
        const num2 = await channel.pop();
        const num3 = await channel.pop();

        strictEqual(num1, 123);
        strictEqual(num2, 456);
        strictEqual(num3, 789);
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
