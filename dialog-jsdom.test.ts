import { ok, strictEqual } from "node:assert";
import { alert, confirm, prompt, progress } from "./dialog.ts";
import { sleep, until } from "./async.ts";
import { as } from "./object.ts";
import { try_ } from "./result.ts";
import { isBrowserWindow } from "./env.ts";
import { fireEvent } from "@testing-library/dom";

// Mock `window.matchMedia` for JSDOM.
globalThis.matchMedia = window.matchMedia = (query) => {
    return {
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { },
        addEventListener: () => { },
        removeListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => true,
    };
};

function html2text(html: string) {
    return html.replace(/&nbsp;/g, " ");
}

describe("dialog", () => {
    if (!isBrowserWindow) {
        return;
    }

    describe("alert", () => {
        it("click OK", async () => {
            const job = alert("Hello, World!");
            const dialog = await until(() => document.body.querySelector("dialog"));
            ok(dialog !== null);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(html2text(p.innerHTML), "Hello, World!");

            const button = dialog.querySelector("button")!;
            ok(button !== null);
            strictEqual(button.textContent, "OK");

            await until(() => dialog.open);
            button.click();

            await until(() => !dialog.open);
            strictEqual(await job, undefined);
        });

        it("timeout", async () => {
            const job = alert("Hello, World!", { timeout: 1_000 });
            const dialog = await until(() => document.body.querySelector("dialog"));
            ok(dialog !== null);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(html2text(p.innerHTML), "Hello, World!");

            const button = dialog.querySelector("button")!;
            ok(button !== null);
            strictEqual(button.textContent, "OK (1)");

            await until(() => dialog.open);
            await until(() => !dialog.open);
            strictEqual(await job, undefined);
        });
    });

    describe("confirm", () => {
        it("click OK", async () => {
            const job = confirm("Are you sure?");
            const dialog = await until(() => document.body.querySelector("dialog"));
            ok(dialog !== null);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(html2text(p.innerHTML), "Are you sure?");

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
            const dialog = await until(() => document.body.querySelector("dialog"));
            ok(dialog !== null);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(html2text(p.innerHTML), "Are you sure?");

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
            const dialog = await until(() => document.body.querySelector("dialog"));
            ok(dialog !== null);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(html2text(p.innerHTML), "Are you sure?");

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

        it("timeout", async () => {
            const job = confirm("Are you sure?", { timeout: 1_000 });
            const dialog = await until(() => document.body.querySelector("dialog"));
            ok(dialog !== null);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(html2text(p.innerHTML), "Are you sure?");

            const buttons = dialog.querySelectorAll("button");
            strictEqual(buttons.length, 2);

            const [cancelButton, okButton] = buttons;
            strictEqual(okButton!.textContent, "OK");
            strictEqual(cancelButton!.textContent, "Cancel (1)");

            await until(() => dialog.open);
            await until(() => !dialog.open);
            strictEqual(await job, false);
        });
    });

    describe("prompt", () => {
        it("input text", async () => {
            const job = prompt("What's your name?");
            const dialog = await until(() => document.body.querySelector("dialog"));
            ok(dialog !== null);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(html2text(p.innerHTML), "What's your name?");

            const input = dialog.querySelector("input")!;
            ok(input !== null);
            strictEqual(input.value, "");
            strictEqual(input.type, "text");

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

        it("input password", async () => {
            const job = prompt("What's your password?", { type: "password" });
            const dialog = await until(() => document.body.querySelector("dialog"));
            ok(dialog !== null);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(html2text(p.innerHTML), "What's your password?");

            const input = dialog.querySelector("input")!;
            ok(input !== null);
            strictEqual(input.value, "");
            strictEqual(input.type, "password");

            const buttons = dialog.querySelectorAll("button");
            strictEqual(buttons.length, 2);

            const [cancelButton, okButton] = buttons;
            strictEqual(okButton!.textContent, "OK");
            strictEqual(cancelButton!.textContent, "Cancel");

            await until(() => dialog.open);
            input.value = "password123";
            okButton!.click();

            await until(() => !dialog.open);
            strictEqual(await job, "password123");
        });

        it("default value", async () => {
            const job = prompt("What's your name?", { defaultValue: "Alice" });
            const dialog = await until(() => document.body.querySelector("dialog"));
            ok(dialog !== null);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(html2text(p.innerHTML), "What's your name?");

            const input = dialog.querySelector("input")!;
            ok(input !== null);
            strictEqual(input.value, "Alice");

            const buttons = dialog.querySelectorAll("button");
            strictEqual(buttons.length, 2);

            const [cancelButton, okButton] = buttons;
            strictEqual(okButton!.textContent, "OK");
            strictEqual(cancelButton!.textContent, "Cancel");

            await until(() => dialog.open);
            okButton!.click();

            await until(() => !dialog.open);
            strictEqual(await job, "Alice");
        });

        it("click OK", async () => {
            const job = prompt("What's your name?");
            const dialog = await until(() => document.body.querySelector("dialog"));
            ok(dialog !== null);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(html2text(p.innerHTML), "What's your name?");

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
            const dialog = await until(() => document.body.querySelector("dialog"));
            ok(dialog !== null);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(html2text(p.innerHTML), "What's your name?");

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
            const dialog = await until(() => document.body.querySelector("dialog"));
            ok(dialog !== null);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(html2text(p.innerHTML), "What's your name?");

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

        it("timeout", async () => {
            const job = prompt("What's your name?", { timeout: 1_000 });
            const dialog = await until(() => document.body.querySelector("dialog"));
            ok(dialog !== null);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(html2text(p.innerHTML), "What's your name?");

            const input = dialog.querySelector("input")!;
            ok(input !== null);

            const buttons = dialog.querySelectorAll("button");
            strictEqual(buttons.length, 2);

            const [cancelButton, okButton] = buttons;
            strictEqual(okButton!.textContent, "OK");
            strictEqual(cancelButton!.textContent, "Cancel (1)");

            await until(() => dialog.open);
            input.value = "Bob";

            await until(() => !dialog.open);
            strictEqual(await job, null);
        });

        it("timeout with default value", async () => {
            const job = prompt("What's your name?", { defaultValue: "Alice", timeout: 1_000 });
            const dialog = await until(() => document.body.querySelector("dialog"));
            ok(dialog !== null);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(html2text(p.innerHTML), "What's your name?");

            const input = dialog.querySelector("input")!;
            ok(input !== null);
            strictEqual(input.value, "Alice");

            const buttons = dialog.querySelectorAll("button");
            strictEqual(buttons.length, 2);

            const [cancelButton, okButton] = buttons;
            strictEqual(okButton!.textContent, "OK (1)");
            strictEqual(cancelButton!.textContent, "Cancel");

            await until(() => dialog.open);
            await until(() => !dialog.open);
            strictEqual(await job, "Alice");
        });

        it("timeout canceled by input", async () => {
            const job = prompt("What's your name?", { timeout: 1_000 });
            const dialog = await until(() => document.body.querySelector("dialog"));
            ok(dialog !== null);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(html2text(p.innerHTML), "What's your name?");

            const input = dialog.querySelector("input")!;
            ok(input !== null);

            const buttons = dialog.querySelectorAll("button");
            strictEqual(buttons.length, 2);

            const [cancelButton, okButton] = buttons;
            strictEqual(okButton!.textContent, "OK");
            strictEqual(cancelButton!.textContent, "Cancel (1)");

            await until(() => dialog.open);
            fireEvent.input(input, { target: { value: "Alice" } });

            strictEqual(okButton!.textContent, "OK");
            strictEqual(cancelButton!.textContent, "Cancel");
            strictEqual(input.value, "Alice");

            await sleep(1100);
            strictEqual(dialog.open, true);

            fireEvent.click(okButton!);
            await until(() => !dialog.open);
            strictEqual(await job, "Alice");
        });

        it("timeout with default value canceled by input", async () => {
            const job = prompt("What's your name?", { defaultValue: "Alice", timeout: 1_000 });
            const dialog = await until(() => document.body.querySelector("dialog"));
            ok(dialog !== null);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(html2text(p.innerHTML), "What's your name?");

            const input = dialog.querySelector("input")!;
            ok(input !== null);
            strictEqual(input.value, "Alice");

            const buttons = dialog.querySelectorAll("button");
            strictEqual(buttons.length, 2);

            const [cancelButton, okButton] = buttons;
            strictEqual(okButton!.textContent, "OK (1)");
            strictEqual(cancelButton!.textContent, "Cancel");

            await until(() => dialog.open);
            fireEvent.input(input, { target: { value: "Bob" } });

            strictEqual(okButton!.textContent, "OK");
            strictEqual(cancelButton!.textContent, "Cancel");
            strictEqual(input.value, "Bob");

            await sleep(1100);
            strictEqual(dialog.open, true);

            fireEvent.click(okButton!);
            await until(() => !dialog.open);
            strictEqual(await job, "Bob");
        });
    });

    describe("progress", () => {
        it("default", async () => {
            const job = progress("Loading...", async () => {
                await sleep(1000);
                return "Success!";
            });
            const dialog = await until(() => document.body.querySelector("dialog"));
            ok(dialog !== null);

            await until(() => dialog.open);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(p.textContent, "Loading...");

            const progressBar = dialog.querySelector("progress")!;
            ok(progressBar !== null);
            strictEqual(progressBar.value, 0);
            strictEqual(progressBar.max, 100);

            const cancelButton = dialog.querySelector("button")!;
            ok(cancelButton !== null);

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
            const dialog = await until(() => document.body.querySelector("dialog"));
            ok(dialog !== null);

            await until(() => dialog.open);

            const p = dialog.querySelector("p")!;
            ok(p !== null);
            strictEqual(p.textContent, "Loading...");

            const progressBar = dialog.querySelector("progress")!;
            ok(progressBar !== null);
            strictEqual(progressBar.value, 0);
            strictEqual(progressBar.max, 100);

            const cancelButton = dialog.querySelector("button")!;
            ok(cancelButton !== null);

            await until(() => progressBar.value === 50);
            strictEqual(html2text(p.innerHTML), "Halfway there...");

            await until(() => !dialog.open);
            strictEqual(await job, "Success!");
        });

        it("cancel", async () => {
            const job = progress("Loading...", async (set) => {
                await sleep(500);
                set({ percent: 50, message: "Halfway there..." });
                await sleep(500);
                return "Success!";
            });
            const dialog = await until(() => document.body.querySelector("dialog"));
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
            strictEqual(html2text(p.innerHTML), "Halfway there...");

            const cancelButton = dialog.querySelector("button")!;
            ok(cancelButton !== null);
            cancelButton.click();

            await until(() => !dialog.open);
            strictEqual(await job, null);
        });

        it("cancel and log", async () => {
            let log: string | null = null;
            const job = progress("Loading...", async (set) => {
                await sleep(500);
                set({ percent: 50, message: "Halfway there..." });
                await sleep(500);
                return "Success!";
            }, () => {
                log = "Canceled";
            });
            const dialog = await until(() => document.body.querySelector("dialog"));
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
            strictEqual(html2text(p.innerHTML), "Halfway there...");

            const cancelButton = dialog.querySelector("button")!;
            ok(cancelButton !== null);
            cancelButton.click();

            await until(() => !dialog.open);
            strictEqual(await job, null);
            strictEqual(log, "Canceled");
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
            const dialog = await until(() => document.body.querySelector("dialog"));
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
            strictEqual(html2text(p.innerHTML), "Halfway there...");

            const cancelButton = dialog.querySelector("button")!;
            ok(cancelButton !== null);
            cancelButton.click();

            await until(() => !dialog.open);
            strictEqual(await job, "Failed!");
        });

        it("cancel with exception", async () => {
            const job = progress("Loading...", async (set) => {
                await sleep(500);
                set({ percent: 50, message: "Halfway there..." });
                await sleep(500);
                return "Success!";
            }, async () => {
                throw new Error("Canceled");
            });
            const dialog = await until(() => document.body.querySelector("dialog"));
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
            strictEqual(html2text(p.innerHTML), "Halfway there...");

            const cancelButton = dialog.querySelector("button")!;
            ok(cancelButton !== null);
            cancelButton.click();

            await until(() => !dialog.open);
            const result = await try_(job);
            strictEqual(result.ok, false);
            strictEqual(as(result.error, Error)?.message, "Canceled");
        });
    });
});
