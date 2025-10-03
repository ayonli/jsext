import "./augment.ts";
import { deepStrictEqual, strictEqual } from "node:assert";

describe("Iterator", () => {
    if (typeof Iterator !== "function") {
        return;
    }

    it("filterMap", () => {
        const arr = [1, 2, 3, 4, 5];
        const result1 = Iterator.from(arr).filterMap((item) => {
            return item % 2 === 0 ? item * 2 : undefined;
        });
        deepStrictEqual([...result1], [4, 8]);

        const result2 = Iterator.from(arr).filterMap((item) => {
            return item > 3 ? item.toString() : null;
        });
        deepStrictEqual([...result2], ["4", "5"]);
    });

    it("dropWhile", () => {
        const iter = [1, 2, 3, 4, 5].values();
        const result = iter.dropWhile((item) => item < 3);
        deepStrictEqual([...result], [3, 4, 5]);
    });

    it("takeWhile", () => {
        const iter = [1, 2, 3, 4, 5].values();
        const result = iter.takeWhile((item) => item < 4);
        deepStrictEqual([...result], [1, 2, 3]);
    });

    it("stepBy", () => {
        const iter = [1, 2, 3, 4, 5, 6, 7, 8, 9].values();
        const result = iter.stepBy(3);
        deepStrictEqual([...result], [1, 4, 7]);
    });

    it("unique", () => {
        const arr = [1, 2, 2, 3, 3, 3, 4, 4, 4, 4];
        const result = arr.values().unique();
        deepStrictEqual([...result], [1, 2, 3, 4]);
    });

    it("uniqueBy", () => {
        const arr = [
            { id: 1, name: "Alice" },
            { id: 2, name: "Bob" },
            { id: 1, name: "Charlie" },
            { id: 3, name: "David" },
            { id: 2, name: "Eve" },
        ];
        const result = arr.values().uniqueBy(item => item.id);
        deepStrictEqual([...result], [
            { id: 1, name: "Alice" },
            { id: 2, name: "Bob" },
            { id: 3, name: "David" },
        ]);
    });

    it("chunk", () => {
        const iter = [1, 2, 3, 4, 5, 6, 7].values();
        const result = iter.chunk(3);
        deepStrictEqual([...result], [[1, 2, 3], [4, 5, 6], [7]]);
    });

    it("partition", () => {
        const arr = [1, 2, 3, 4, 5, 6];
        const [even, odd] = arr.values().partition((item) => item % 2 === 0);
        deepStrictEqual([...even], [2, 4, 6]);
        deepStrictEqual([...odd], [1, 3, 5]);
    });

    it("zip", () => {
        const iter1 = [1, 2, 3].values();
        const iter2 = ["a", "b", "c", "d"].values();
        const result = iter1.zip(iter2);
        deepStrictEqual([...result], [[1, "a"], [2, "b"], [3, "c"]]);
    });

    it("unzip", () => {
        const arr: [number, string][] = [[1, "a"], [2, "b"], [3, "c"]];
        const result = arr.values().unzip();
        deepStrictEqual(result, [[1, 2, 3], ["a", "b", "c"]]);
    });

    it("flat", () => {
        const arr = [1, [2, 3], 4, [5, 6], 7];
        const result = arr.values().flat();
        deepStrictEqual([...result], [1, 2, 3, 4, 5, 6, 7]);
    });

    it("concat", () => {
        const iter1 = [1, 2, 3].values();
        const iter2 = [4, 5].values();
        const result = iter1.concat(iter2);
        deepStrictEqual([...result], [1, 2, 3, 4, 5]);
    });

    it("inspect", () => {
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

    it("enumerate", () => {
        const iter = ["a", "b", "c"].values();
        const result = iter.enumerate();
        deepStrictEqual([...result], [[0, "a"], [1, "b"], [2, "c"]]);
    });

    it("nth", () => {
        const iter1 = [10, 20, 30, 40, 50].values();
        const iter2 = [10, 20, 30].values();
        const iter3 = [1, 2, 3].values();
        strictEqual(iter1.nth(2), 30);
        strictEqual(iter1.nth(5), undefined);
        strictEqual(iter2.nth(0), 10);
        strictEqual(iter2.nth(3), undefined);
        strictEqual(iter3.nth(0), 1);
        strictEqual(iter3.nth(0), 2);
        strictEqual(iter3.nth(0), 3);
        strictEqual(iter3.nth(0), undefined);
        strictEqual(iter3.nth(-1), undefined);
    });

    it("last", () => {
        const iter1 = [1, 2, 3].values();
        const iter2 = [].values();
        deepStrictEqual(iter1.last(), 3);
        deepStrictEqual(iter2.last(), undefined);
    });

    it("min", () => {
        const iter1 = [3, 1, 4, 1, 5, 9].values();
        const iter2 = [].values();
        deepStrictEqual(iter1.min(), 1);
        deepStrictEqual(iter2.min(), undefined);
    });

    it("max", () => {
        const iter1 = [3, 1, 4, 1, 5, 9].values();
        const iter2 = [].values();
        deepStrictEqual(iter1.max(), 9);
        deepStrictEqual(iter2.max(), undefined);
    });

    it("avg", () => {
        const iter1 = [1, 2, 3, 4, 5].values();
        const iter2 = [].values();
        deepStrictEqual(iter1.avg(), 3);
        deepStrictEqual(iter2.avg(), undefined);
    });

    it("sum", () => {
        const iter1 = [1, 2, 3, 4, 5].values();
        const iter2 = [].values();
        deepStrictEqual(iter1.sum(), 15);
        deepStrictEqual(iter2.sum(), 0);
    });

    it("product", () => {
        const iter1 = [1, 2, 3, 4].values();
        const iter2 = [].values();
        deepStrictEqual(iter1.product(), 24);
        deepStrictEqual(iter2.product(), 1);
    });
});
