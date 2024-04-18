import { ok, strictEqual } from "node:assert";
import { isBrowser } from "./env.ts";
import { importScript, importStylesheet } from "./module.ts";

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

describe("module", () => {
    if (!isBrowser) {
        return;
    }

    it("importScript", async () => {
        // Don't wait here because JSDOM doesn't actually load the script.
        importScript("https://code.jquery.com/jquery-3.6.0.min.js");

        const script = document.querySelector<HTMLScriptElement>(
            "script[src='https://code.jquery.com/jquery-3.6.0.min.js']");
        ok(script !== null);
        strictEqual(script.type, "text/javascript");
    });

    it("importScript (module)", async () => {
        // Don't wait here because JSDOM doesn't actually load the script.
        importScript("https://code.jquery.com/jquery-3.5.0.min.js", { type: "module" });

        const script = document.querySelector<HTMLScriptElement>(
            "script[src='https://code.jquery.com/jquery-3.5.0.min.js']");
        ok(script !== null);
        strictEqual(script.type, "module");
    });

    it("importStylesheet", async () => {
        // Don't wait here because JSDOM doesn't actually load the stylesheet.
        importStylesheet("https://code.jquery.com/jquery-3.6.0.min.css");

        const link = document.querySelector<HTMLLinkElement>(
            "link[href='https://code.jquery.com/jquery-3.6.0.min.css']");
        ok(link !== null);
        strictEqual(link.rel, "stylesheet");
    });
});
