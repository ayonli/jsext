import { ok, strictEqual } from "node:assert";
import { alert, confirm, prompt, progress } from "./index.ts";
import { sleep, until } from "../promise/index.ts";
import { as } from "../object/index.ts";
import _try from "../try.ts";

describe("dialog", () => {
    if (typeof document === "undefined") {
        return;
    }

    it("alert", async () => {
        const job = alert("Hello, World!");
        const dialog = document.body.querySelector("dialog")!;
        ok(dialog !== null);

        const p = dialog.querySelector("p")!;
        ok(p !== null);
        strictEqual(p.textContent, "Hello, World!");

        const button = dialog.querySelector("button")!;
        ok(button !== null);
        strictEqual(button.textContent, "OK");

        await until(() => dialog.open);
        button.click();

        await until(() => !dialog.open);
        strictEqual(await job, undefined);
    });

    describe("confirm", () => {
        it("click OK", async () => {
            const job = confirm("Are you sure?");
            const dialog = document.body.querySelector("dialog")!;
            ok(dialog !== null);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(p.textContent, "Are you sure?");

            const buttons = dialog.querySelectorAll("button");
            strictEqual(buttons.length, 2);

            const [cancelButton, okButton] = buttons;
            strictEqual(okButton!.textContent, "OK");
            strictEqual(cancelButton!.textContent, "Cancel");

            await until(() => dialog.open);
            okButton!.click();

            await until(() => !dialog.open);
            strictEqual(await job, true);
        });

        it("click Cancel", async () => {
            const job = confirm("Are you sure?");
            const dialog = document.body.querySelector("dialog")!;
            ok(dialog !== null);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(p.textContent, "Are you sure?");

            const buttons = dialog.querySelectorAll("button");
            strictEqual(buttons.length, 2);

            const [cancelButton, okButton] = buttons;
            strictEqual(okButton!.textContent, "OK");
            strictEqual(cancelButton!.textContent, "Cancel");

            await until(() => dialog.open);
            cancelButton!.click();

            await until(() => !dialog.open);
            strictEqual(await job, false);
        });

        it("press Enter", async () => {
            const job = confirm("Are you sure?");
            const dialog = document.body.querySelector("dialog")!;
            ok(dialog !== null);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(p.textContent, "Are you sure?");

            const buttons = dialog.querySelectorAll("button");
            strictEqual(buttons.length, 2);

            const [cancelButton, okButton] = buttons;
            strictEqual(okButton!.textContent, "OK");
            strictEqual(cancelButton!.textContent, "Cancel");

            await until(() => dialog.open);
            const event = new KeyboardEvent("keypress", { key: "Enter" });
            dialog.dispatchEvent(event);

            await until(() => !dialog.open);
            strictEqual(await job, true);
        });
    });

    describe("prompt", () => {
        it("click OK", async () => {
            const job = prompt("What's your name?");
            const dialog = document.body.querySelector("dialog")!;
            ok(dialog !== null);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(p.textContent, "What's your name?");

            const input = dialog.querySelector("input")!;
            ok(input !== null);

            const buttons = dialog.querySelectorAll("button");
            strictEqual(buttons.length, 2);

            const [cancelButton, okButton] = buttons;
            strictEqual(okButton!.textContent, "OK");
            strictEqual(cancelButton!.textContent, "Cancel");

            await until(() => dialog.open);
            input.value = "Alice";
            okButton!.click();

            await until(() => !dialog.open);
            strictEqual(await job, "Alice");
        });

        it("click Cancel", async () => {
            const job = prompt("What's your name?");
            const dialog = document.body.querySelector("dialog")!;
            ok(dialog !== null);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(p.textContent, "What's your name?");

            const input = dialog.querySelector("input")!;
            ok(input !== null);

            const buttons = dialog.querySelectorAll("button");
            strictEqual(buttons.length, 2);

            const [cancelButton, okButton] = buttons;
            strictEqual(okButton!.textContent, "OK");
            strictEqual(cancelButton!.textContent, "Cancel");

            await until(() => dialog.open);
            input.value = "Bob";
            cancelButton!.click();

            await until(() => !dialog.open);
            strictEqual(await job, null);
        });

        it("press Enter", async () => {
            const job = prompt("What's your name?");
            const dialog = document.body.querySelector("dialog")!;
            ok(dialog !== null);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(p.textContent, "What's your name?");

            const input = dialog.querySelector("input")!;
            ok(input !== null);

            const buttons = dialog.querySelectorAll("button");
            strictEqual(buttons.length, 2);

            const [cancelButton, okButton] = buttons;
            strictEqual(okButton!.textContent, "OK");
            strictEqual(cancelButton!.textContent, "Cancel");

            await until(() => dialog.open);
            input.value = "Charlie";
            const event = new KeyboardEvent("keypress", { key: "Enter" });
            dialog.dispatchEvent(event);

            await until(() => !dialog.open);
            strictEqual(await job, "Charlie");
        });
    });

    describe("progress", () => {
        it("default", async () => {
            const job = progress("Loading...", async () => {
                await sleep(1000);
                return "Success!";
            });
            const dialog = document.body.querySelector("dialog")!;
            ok(dialog !== null);

            await until(() => dialog.open);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(p.textContent, "Loading...");

            const progressBar = dialog.querySelector("progress")!;
            ok(progressBar !== null);
            strictEqual(progressBar.value, 0);
            strictEqual(progressBar.max, 100);

            const button = dialog.querySelector("button")!;
            ok(button === null);

            await until(() => !dialog.open);
            strictEqual(await job, "Success!");
        });

        it("update", async () => {
            const job = progress("Loading...", async (set) => {
                await sleep(500);
                set({ percent: 50, message: "Halfway there..." });
                await sleep(500);
                return "Success!";
            });
            const dialog = document.body.querySelector("dialog")!;
            ok(dialog !== null);

            await until(() => dialog.open);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(p.textContent, "Loading...");

            const progressBar = dialog.querySelector("progress")!;
            ok(progressBar !== null);
            strictEqual(progressBar.value, 0);
            strictEqual(progressBar.max, 100);

            const button = dialog.querySelector("button")!;
            ok(button === null);

            await until(() => progressBar.value === 50);
            strictEqual(p.textContent, "Halfway there...");

            await until(() => !dialog.open);
            strictEqual(await job, "Success!");
        });

        it("cancel with fallback", async () => {
            const job = progress("Loading...", async (set) => {
                await sleep(500);
                set({ percent: 50, message: "Halfway there..." });
                await sleep(500);
                return "Success!";
            }, async () => {
                return "Failed!";
            });
            const dialog = document.body.querySelector("dialog")!;
            ok(dialog !== null);

            await until(() => dialog.open);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(p.textContent, "Loading...");

            const progressBar = dialog.querySelector("progress")!;
            ok(progressBar !== null);
            strictEqual(progressBar.value, 0);
            strictEqual(progressBar.max, 100);

            await until(() => progressBar.value === 50);
            strictEqual(p.textContent, "Halfway there...");

            const cancelButton = dialog.querySelector("button")!;
            ok(cancelButton !== null);
            cancelButton.click();

            await until(() => !dialog.open);
            strictEqual(await job, "Failed!");
        });

        it("cancel with reject", async () => {
            const job = progress("Loading...", async (set) => {
                await sleep(500);
                set({ percent: 50, message: "Halfway there..." });
                await sleep(500);
                return "Success!";
            }, async () => {
                throw new Error("Canceled");
            });
            const dialog = document.body.querySelector("dialog")!;
            ok(dialog !== null);

            await until(() => dialog.open);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(p.textContent, "Loading...");

            const progressBar = dialog.querySelector("progress")!;
            ok(progressBar !== null);
            strictEqual(progressBar.value, 0);
            strictEqual(progressBar.max, 100);

            await until(() => progressBar.value === 50);
            strictEqual(p.textContent, "Halfway there...");

            const cancelButton = dialog.querySelector("button")!;
            ok(cancelButton !== null);
            cancelButton.click();

            await until(() => !dialog.open);
            const [err] = await _try(job);
            strictEqual(as(err, Error)?.message, "Canceled");
        });
    });
});
