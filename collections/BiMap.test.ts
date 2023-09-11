import BiMap from "./BiMap";
import { describe, test } from "mocha";
import { ok, strictEqual } from "assert";

describe("BiMap", () => {
    test("new BiMap", () => {
        const map = new BiMap<string, string>([
            ["foo", "hello"],
            ["bar", "world"]
        ]);

        strictEqual(String(map), "[object BiMap]");
        ok(map.has("foo"));
        ok(map.has("bar"));
        ok(map.hasValue("hello"));
        ok(map.hasValue("world"));
        strictEqual(map.get("foo"), "hello");
        strictEqual(map.getKey("world"), "bar");
    });

    test("BiMap.prototype.set", () => {
        const map = new BiMap<string, string>();

        map.set("foo", "hello").set("bar", "world");

        ok(map.has("foo"));
        ok(map.has("bar"));
        strictEqual(map.get("foo"), "hello");
        strictEqual(map.get("bar"), "world");
    });

    test("BiMap.prototype.getKey", () => {
        const map = new BiMap<string, string>([
            ["foo", "hello"],
            ["bar", "world"]
        ]);

        strictEqual(map.getKey("hello"), "foo");
        strictEqual(map.getKey("world"), "bar");
    });

    test("BiMap.prototype.hasValue", () => {
        const map = new BiMap<string, string>([
            ["foo", "hello"],
            ["bar", "world"]
        ]);

        ok(map.hasValue("hello"));
        ok(map.hasValue("world"));
    });

    test("BiMap.prototype.deleteValue", () => {
        const map = new BiMap<string, string>([
            ["foo", "hello"],
            ["bar", "world"]
        ]);

        map.deleteValue("hello");
        ok(!map.has("foo"));
        ok(map.has("bar"));
    });

    test("BiMap.prototype.clear", () => {
        const map = new BiMap<string, string>([
            ["foo", "hello"],
            ["bar", "world"]
        ]);

        map.clear();
        ok(map.size === 0);
        ok(!map.has("foo"));
        ok(!map.hasValue("world"));
    });
});
