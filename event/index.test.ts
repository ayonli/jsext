import { strictEqual } from "node:assert";
import { createCloseEvent, createCustomEvent, createErrorEvent, createProgressEvent } from "./index.ts";

describe("event", () => {
    if (typeof Event === "undefined")
        return;

    it("createErrorEvent", () => {
        const event = createErrorEvent("error", {
            message: "Something went wrong.",
            filename: "",
            lineno: 1,
            colno: 13,
        });

        strictEqual(event.type, "error");
        strictEqual(event.message, "Something went wrong.");
        strictEqual(event.filename, "");
        strictEqual(event.lineno, 1);
        strictEqual(event.colno, 13);
    });

    it("createCloseEvent", () => {
        const event = createCloseEvent("close", {
            code: 1000,
            reason: "Normal closure",
            wasClean: true,
        });

        strictEqual(event.type, "close");
        strictEqual(event.code, 1000);
        strictEqual(event.reason, "Normal closure");
        strictEqual(event.wasClean, true);
    });

    it("createProgressEvent", () => {
        const event = createProgressEvent("progress", {
            lengthComputable: true,
            loaded: 50,
            total: 100,
        });

        strictEqual(event.type, "progress");
        strictEqual(event.lengthComputable, true);
        strictEqual(event.loaded, 50);
        strictEqual(event.total, 100);
    });

    it("createCustomEvent", () => {
        const event = createCustomEvent("custom", {
            detail: "Hello, world!",
        });

        strictEqual(event.type, "custom");
        strictEqual(event.detail, "Hello, world!");
    });
});
