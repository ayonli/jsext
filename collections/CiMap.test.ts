import "../augment/index.ts";
import { deepStrictEqual, ok, strictEqual } from "node:assert";

describe("CiMap", () => {
    it("new CiMap", () => {
        const map = new CiMap<string, string>([
            ["Foo", "hello"],
            ["Bar", "world"]
        ]);

        strictEqual(String(map), "[object CiMap]");
        ok(map.has("foo"));
        ok(map.has("Bar"));
        strictEqual(map.get("Foo"), "hello");
        strictEqual(map.get("bar"), "world");
        strictEqual(map.size, 2);
    });

    it("CiMap.prototype.set", () => {
        const map = new CiMap<string, string>();

        map.set("Foo", "hello");
        strictEqual(map.size, 1);

        map.set("Bar", "world");
        strictEqual(map.size, 2);

        ok(map.has("foo"));
        ok(map.has("Bar"));
        strictEqual(map.get("Foo"), "hello");
        strictEqual(map.get("bar"), "world");
    });

    it("CiMap.prototype.get", () => {
        const map = new CiMap<string, string>([
            ["Foo", "hello"],
            ["Bar", "world"]
        ]);

        strictEqual(map.get("Foo"), "hello");
        strictEqual(map.get("bar"), "world");
    });

    it("CiMap.prototype.has", () => {
        const map = new CiMap<string, string>([
            ["Foo", "hello"],
            ["Bar", "world"]
        ]);

        ok(map.has("foo"));
        ok(map.has("Bar"));
    });

    it("CiMap.prototype.delete", () => {
        const map = new CiMap<string, string>([
            ["Foo", "hello"],
            ["Bar", "world"]
        ]);

        map.delete("foo");

        ok(!map.has("foo"));
        ok(map.has("bar"));
        strictEqual(map.size, 1);

        map.delete("bar");
        ok(!map.has("bar"));
        strictEqual(map.size, 0);
    });

    it("CiMap.prototype.clear", () => {
        const map = new CiMap<string, string>([
            ["Foo", "hello"],
            ["Bar", "world"]
        ]);

        map.clear();

        ok(!map.has("Foo"));
        ok(!map.has("bar"));
        strictEqual(map.size, 0);
    });

    it("CiMap.prototype.entries", () => {
        const map1 = new CiMap<string, string>([
            ["Foo", "hello"],
            ["Bar", "world"]
        ]);
        const map2 = new Map<string, string>([
            ["Foo", "hello"],
            ["Bar", "world"]
        ]);

        deepStrictEqual([...map1.entries()], [...map2.entries()]);
    });

    it("CiMap.prototype.keys", () => {
        const map1 = new CiMap<string, string>([
            ["Foo", "hello"],
            ["Bar", "world"]
        ]);
        const map2 = new Map<string, string>([
            ["Foo", "hello"],
            ["Bar", "world"]
        ]);

        deepStrictEqual([...map1.keys()], [...map2.keys()]);
    });

    it("CiMap.prototype.values", () => {
        const map1 = new CiMap<string, string>([
            ["Foo", "hello"],
            ["Bar", "world"]
        ]);
        const map2 = new Map<string, string>([
            ["Foo", "hello"],
            ["Bar", "world"]
        ]);

        deepStrictEqual([...map1.values()], [...map2.values()]);
    });

    it("CiMap.prototype[Symbol.iterator]", () => {
        const map1 = new CiMap<string, string>([
            ["Foo", "hello"],
            ["Bar", "world"]
        ]);
        const map2 = new Map<string, string>([
            ["Foo", "hello"],
            ["Bar", "world"]
        ]);

        deepStrictEqual([...map1], [...map2]);
    });

    it("CiMap.prototype.forEach", () => {
        const map = new CiMap<string, string>([
            ["Foo", "hello"],
            ["Bar", "world"]
        ]);
        const records: { key: string; value: string; }[] = [];

        map.forEach((value, key) => {
            records.push({ key, value });
        });

        deepStrictEqual(records, [
            { key: "Foo", value: "hello" },
            { key: "Bar", value: "world" },
        ]);
    });
});
