import CiMap from "./CiMap";
import { describe, test } from "mocha";
import { deepStrictEqual, ok, strictEqual } from "assert";

describe("CiMap", () => {
    test("new CiMap", () => {
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

    test("CiMap.prototype.set", () => {
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

    test("CiMap.prototype.get", () => {
        const map = new CiMap<string, string>([
            ["Foo", "hello"],
            ["Bar", "world"]
        ]);

        strictEqual(map.get("Foo"), "hello");
        strictEqual(map.get("bar"), "world");
    });

    test("CiMap.prototype.has", () => {
        const map = new CiMap<string, string>([
            ["Foo", "hello"],
            ["Bar", "world"]
        ]);

        ok(map.has("foo"));
        ok(map.has("Bar"));
    });

    test("CiMap.prototype.delete", () => {
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

    test("CiMap.prototype.clear", () => {
        const map = new CiMap<string, string>([
            ["Foo", "hello"],
            ["Bar", "world"]
        ]);

        map.clear();

        ok(!map.has("Foo"));
        ok(!map.has("bar"));
        strictEqual(map.size, 0);
    });

    test("CiMap.prototype.entries", () => {
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

    test("CiMap.prototype.keys", () => {
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

    test("CiMap.prototype.values", () => {
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

    test("CiMap.prototype[Symbol.iterator]", () => {
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

    test("CiMap.prototype.forEach", () => {
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
