import "../augment.ts";
import { ok, strictEqual } from "node:assert";

describe("BiMap", () => {
    it("new BiMap", () => {
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

    it("BiMap.prototype.set", () => {
        const map = new BiMap<string, string>();

        map.set("foo", "hello").set("bar", "world");

        ok(map.has("foo"));
        ok(map.has("bar"));
        strictEqual(map.get("foo"), "hello");
        strictEqual(map.get("bar"), "world");
    });

    it("BiMap.prototype.getKey", () => {
        const map = new BiMap<string, string>([
            ["foo", "hello"],
            ["bar", "world"]
        ]);

        strictEqual(map.getKey("hello"), "foo");
        strictEqual(map.getKey("world"), "bar");
    });

    it("BiMap.prototype.hasValue", () => {
        const map = new BiMap<string, string>([
            ["foo", "hello"],
            ["bar", "world"]
        ]);

        ok(map.hasValue("hello"));
        ok(map.hasValue("world"));
    });

    it("BiMap.prototype.deleteValue", () => {
        const map = new BiMap<string, string>([
            ["foo", "hello"],
            ["bar", "world"]
        ]);

        map.deleteValue("hello");
        ok(!map.has("foo"));
        ok(map.has("bar"));
    });

    it("BiMap.prototype.clear", () => {
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
