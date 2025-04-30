import { deepStrictEqual, strictEqual } from "node:assert";
import { sleep } from "./async.ts";
import jsext from "./index.ts";

describe("jsext.once", () => {
    it("sync", () => {
        const getMap = jsext.once(() => new Map());
        const map1 = getMap();
        map1.set("key", "value");
        strictEqual(map1.get("key"), "value");

        const map2 = getMap();
        strictEqual(map1, map2);
    });

    it("async", async () => {
        const getDb = jsext.once(async () => {
            await sleep(100);
            return { db: "db" };
        });

        const [db1, db2] = await Promise.all([
            getDb(),
            getDb(),
        ]);
        deepStrictEqual(db1, { db: "db" });
        strictEqual(db1, db2);
    });
});
