import { deepStrictEqual, strictEqual } from "node:assert";
import jsext from "./index.ts";

describe("jsext.queue", () => {
    it("success", async () => {
        const out = jsext.chan<string[]>();
        const list: string[] = [];
        const queue = jsext.queue(async (str: string) => {
            await Promise.resolve(null);
            list.push(str);

            if (list.length === 2) {
                out.push(list);
            }
        });

        (async () => {
            await queue.push("foo");
        })();

        (async () => {
            await queue.push("bar");
        })();

        strictEqual((await out.pop())?.length, 2);
        queue.close();
    });

    it("error", async () => {
        const out = jsext.chan<Error>();
        const queue = jsext.queue(async (str: string) => {
            if (str === "error") {
                throw new Error("something went wrong");
            }
        });

        queue.onError(err => {
            out.push(err as Error);
        });

        queue.push("error");

        const err = await out.pop();
        deepStrictEqual(err, new Error("something went wrong"));
    });
});
