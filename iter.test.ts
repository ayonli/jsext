import "./augment.ts";
import { deepStrictEqual } from "node:assert";

describe("Iterator", () => {
    if (typeof Iterator !== "function") {
        return;
    }

    it("concat", async () => {
        const iter1 = [1, 2, 3].values();
        const iter2 = [4, 5].values();
        const result = iter1.concat(iter2);
        deepStrictEqual([...result], [1, 2, 3, 4, 5]);
    });

    it("filterMap", async () => {
        const iter = [1, 2, 3, 4, 5].values();
        const result = iter.filterMap((item) => {
            return item % 2 === 0 ? item * 2 : undefined;
        });
        deepStrictEqual([...result], [4, 8]);
    });

    it("inspect", async () => {
        const iter = [1, 2, 3].values();
        const inspected: string[] = [];
        const result = iter.inspect((item) => {
            inspected.push(`before: ${item}`);
        }).map((item) => {
            return item * 2;
        }).inspect((item) => {
            inspected.push(`after: ${item}`);
        }).toArray();

        deepStrictEqual(result, [2, 4, 6]);
        deepStrictEqual(inspected, [
            "before: 1",
            "after: 2",
            "before: 2",
            "after: 4",
            "before: 3",
            "after: 6",
        ]);
    });

    it("stepBy", async () => {
        const iter = [1, 2, 3, 4, 5, 6, 7, 8, 9].values();
        const result = iter.stepBy(3);
        deepStrictEqual([...result], [1, 4, 7]);
    });

    it("chunk", async () => {
        const iter = [1, 2, 3, 4, 5, 6, 7].values();
        const result = iter.chunk(3);
        deepStrictEqual([...result], [[1, 2, 3], [4, 5, 6], [7]]);
    });

    it("enumerate", async () => {
        const iter = ["a", "b", "c"].values();
        const result = iter.enumerate();
        deepStrictEqual([...result], [[0, "a"], [1, "b"], [2, "c"]]);
    });

    it("zip", async () => {
        const iter1 = [1, 2, 3].values();
        const iter2 = ["a", "b", "c", "d"].values();
        const result = iter1.zip(iter2);
        deepStrictEqual([...result], [[1, "a"], [2, "b"], [3, "c"]]);
    });
});
