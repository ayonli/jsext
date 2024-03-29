import "../augment.ts";
import { strictEqual, deepStrictEqual, notDeepEqual, ok } from "node:assert";

describe("Array", () => {
    it("Array.prototype.first", () => {
        const arr = [1, 2, 3, 4, 5];
        strictEqual(arr.first(), 1);
        strictEqual([].first(), undefined);
    });

    it("Array.prototype.last", () => {
        const arr = [1, 2, 3, 4, 5];
        strictEqual(arr.last(), 5);
        strictEqual([].last(), undefined);
    });

    it("Array.prototype.random", () => {
        const arr = [1, 2, 3, 4, 5];
        ok(arr.includes(arr.random() as number));
        strictEqual([].random(), undefined);

        const item = arr.random(true) as number;
        ok(item > 0);
        ok(!arr.includes(item));
    });

    it("Array.prototype.count", () => {
        const arr = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0];
        strictEqual(arr.count(3), 2);
        strictEqual(arr.count(10), 0);
    });

    it("Array.prototype.equals", () => {
        const arr = [1, 2, 3, 4, 5];
        strictEqual(arr.equals([1, 2, 3, 4, 5]), true);
        strictEqual(arr.equals([1, 2, 3, 4]), false);
        strictEqual(arr.equals([2, 3, 4, 5, 6]), false);
    });

    it("Array.prototype.split", () => {
        const arr1 = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1];
        deepStrictEqual(arr1.split(2), [[0, 1], [3, 4, 5, 4, 3], [1]]);
        deepStrictEqual(arr1.split(5), [[0, 1, 2, 3, 4], [4, 3, 2, 1]]);
        deepStrictEqual(arr1.split(1), [[0], [2, 3, 4, 5, 4, 3, 2], []]);

        const arr2 = ["foo", "bar", "foo", "abc", "def", "foo", "bar"];
        deepStrictEqual(arr2.split("foo"), [[], ["bar"], ["abc", "def"], ["bar"]]);
        deepStrictEqual(arr2.split("bar"), [["foo"], ["foo", "abc", "def", "foo"], []]);
    });

    it("Array.prototype.chunk", () => {
        const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        deepStrictEqual(arr.chunk(2), [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]]);
        deepStrictEqual(arr.chunk(3), [[0, 1, 2], [3, 4, 5], [6, 7, 8], [9]]);
    });

    it("Array.prototype.shuffle", () => {
        const arr1 = [0, 12, 3, 4, 5, 6, 7, 8, 9];
        const arr2 = arr1.slice();
        const arr3 = arr1.slice();

        arr2.shuffle();
        arr3.shuffle();

        strictEqual(arr2.length, arr1.length);
        strictEqual(arr2.length, arr3.length);
        notDeepEqual(arr2, arr1);
        notDeepEqual(arr2, arr3);
        notDeepEqual(arr3, arr1);
    });

    it("Array.prototype.toShuffled", () => {
        const arr1 = [0, 12, 3, 4, 5, 6, 7, 8, 9];
        const arr2 = arr1.toShuffled();
        strictEqual(arr2.length, arr1.length);
        notDeepEqual(arr2, arr1);
    });

    it("Array.prototype.toReversed", () => {
        const arr1 = [0, 12, 3, 4, 5, 6, 7, 8, 9];
        const arr2 = arr1.toReversed();
        deepStrictEqual(arr2, arr1.slice().reverse());
    });

    it("Array.prototype.toSorted", () => {
        const arr1 = [0, 12, 3, 4, 5, 6, 7, 8, 9];
        const arr2 = arr1.toSorted();
        deepStrictEqual(arr2, arr1.slice().sort());

        const arr3 = arr1.toSorted((a, b) => b - a);
        deepStrictEqual(arr3, arr1.slice().sort((a, b) => b - a));
    });

    it("Array.prototype.uniq", () => {
        const list = [1, 2, 3, 4, 2, 3, 1].uniq();
        deepStrictEqual(list, [1, 2, 3, 4]);
    });

    it("Array.prototype.uniqBy", () => {
        type Item = { group: string; tag: string; };
        const arr: Item[] = [
            {
                group: "world",
                tag: "A",
            },
            {
                group: "room",
                tag: "B",
            },
            {
                group: "room",
                tag: "C",
            }
        ];

        const list = arr.uniqBy(item => item.group);
        deepStrictEqual(list, [
            {
                group: "world",
                tag: "A",
            },
            {
                group: "room",
                tag: "B",
            }
        ]);
    });

    it("Array.prototype.orderBy", () => {
        type Item = { id: string; age: number; tag: string; };
        const arr1: Item[] = [
            {
                id: "world",
                age: 53,
                tag: "A",
            },
            {
                id: "ayon",
                age: 28,
                tag: "B",
            },
            {
                id: "claire",
                age: 25,
                tag: "B",
            },
        ];

        it("key", () => {
            const arr2 = arr1.orderBy("age");
            const arr3 = arr1.orderBy("age", "desc");
            const arr4 = arr1.orderBy("id", "asc");
            const arr5 = arr1.orderBy("tag", "desc");

            deepStrictEqual(arr2, [
                {
                    id: "claire",
                    age: 25,
                    tag: "B",
                },
                {
                    id: "ayon",
                    age: 28,
                    tag: "B",
                },
                {
                    id: "world",
                    age: 53,
                    tag: "A",
                },
            ] as Item[]);
            deepStrictEqual(arr3, [
                {
                    id: "world",
                    age: 53,
                    tag: "A",
                },
                {
                    id: "ayon",
                    age: 28,
                    tag: "B",
                },
                {
                    id: "claire",
                    age: 25,
                    tag: "B",
                },
            ] as Item[]);
            deepStrictEqual(arr4, [
                {
                    id: "ayon",
                    age: 28,
                    tag: "B",
                },
                {
                    id: "claire",
                    age: 25,
                    tag: "B",
                },
                {
                    id: "world",
                    age: 53,
                    tag: "A",
                },
            ] as Item[]);
            deepStrictEqual(arr5, [
                {
                    id: "claire",
                    age: 25,
                    tag: "B",
                },
                {
                    id: "ayon",
                    age: 28,
                    tag: "B",
                },
                {
                    id: "world",
                    age: 53,
                    tag: "A",
                },
            ] as Item[]);
        });

        it("fn", () => {
            const arr2 = arr1.orderBy(item => item.age);
            const arr3 = arr1.orderBy(item => item.age, "desc");
            const arr4 = arr1.orderBy(item => item.id, "asc");
            const arr5 = arr1.orderBy(item => item.tag, "desc");

            deepStrictEqual(arr2, [
                {
                    id: "claire",
                    age: 25,
                    tag: "B",
                },
                {
                    id: "ayon",
                    age: 28,
                    tag: "B",
                },
                {
                    id: "world",
                    age: 53,
                    tag: "A",
                },
            ] as Item[]);
            deepStrictEqual(arr3, [
                {
                    id: "world",
                    age: 53,
                    tag: "A",
                },
                {
                    id: "ayon",
                    age: 28,
                    tag: "B",
                },
                {
                    id: "claire",
                    age: 25,
                    tag: "B",
                },
            ] as Item[]);
            deepStrictEqual(arr4, [
                {
                    id: "ayon",
                    age: 28,
                    tag: "B",
                },
                {
                    id: "claire",
                    age: 25,
                    tag: "B",
                },
                {
                    id: "world",
                    age: 53,
                    tag: "A",
                },
            ] as Item[]);
            deepStrictEqual(arr5, [
                {
                    id: "claire",
                    age: 25,
                    tag: "B",
                },
                {
                    id: "ayon",
                    age: 28,
                    tag: "B",
                },
                {
                    id: "world",
                    age: 53,
                    tag: "A",
                },
            ] as Item[]);
        });
    });

    describe("Array.prototype.groupBy", () => {
        type Item = { group: string; tag: string; };
        const arr: Item[] = [
            {
                group: "world",
                tag: "A",
            },
            {
                group: "room",
                tag: "B",
            },
            {
                group: "room",
                tag: "C",
            }
        ];

        it("Object", () => {
            const record = arr.groupBy(item => item.group);
            deepStrictEqual(record, {
                world: [{ group: "world", tag: "A" }],
                room: [{ group: "room", tag: "B" }, { group: "room", tag: "C" }]
            });
        });

        it("Map", () => {
            const map1 = arr.groupBy(item => item.group, Map);
            deepStrictEqual(map1, new Map<string, Item[]>([
                ["world", [{ group: "world", tag: "A" }]],
                ["room", [{ group: "room", tag: "B" }, { group: "room", tag: "C" }]]
            ]));

            const map2 = arr.groupBy(item => item.group, BiMap);
            deepStrictEqual(map2, new BiMap<string, Item[]>([
                ["world", [{ group: "world", tag: "A" }]],
                ["room", [{ group: "room", tag: "B" }, { group: "room", tag: "C" }]]
            ]));

            const map3 = arr.groupBy(item => item.group, CiMap);
            deepStrictEqual(map3, new CiMap<string, Item[]>([
                ["world", [{ group: "world", tag: "A" }]],
                ["room", [{ group: "room", tag: "B" }, { group: "room", tag: "C" }]]
            ]));
        });
    });

    describe("Array.prototype.keyBy", () => {
        type Item = { group: string; tag: string; };
        const arr: Item[] = [
            {
                group: "world",
                tag: "A",
            },
            {
                group: "room",
                tag: "B",
            },
            {
                group: "room",
                tag: "C",
            }
        ];

        it("Object", () => {
            const record = arr.keyBy(item => item.tag);
            deepStrictEqual(record, {
                A: { group: "world", tag: "A" },
                B: { group: "room", tag: "B" },
                C: { group: "room", tag: "C" },
            });
        });

        it("Map", () => {
            const map1 = arr.keyBy(item => item.tag, Map);
            deepStrictEqual(map1, new Map<string, Item>([
                ["A", { group: "world", tag: "A" }],
                ["B", { group: "room", tag: "B" }],
                ["C", { group: "room", tag: "C" }]
            ]));

            const map2 = arr.keyBy(item => item.tag, BiMap);
            deepStrictEqual(map2, new BiMap<string, Item>([
                ["A", { group: "world", tag: "A" }],
                ["B", { group: "room", tag: "B" }],
                ["C", { group: "room", tag: "C" }]
            ]));

            const map3 = arr.keyBy(item => item.tag, CiMap);
            deepStrictEqual(map3, new CiMap<string, Item>([
                ["A", { group: "world", tag: "A" }],
                ["B", { group: "room", tag: "B" }],
                ["C", { group: "room", tag: "C" }]
            ]));
        });
    });
});
