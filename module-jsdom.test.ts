import { ok, strictEqual } from "node:assert";
import { Server, createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { isBrowserWindow } from "./env.ts";
import { importScript, importStylesheet } from "./module.ts";
import { extname, resolve as resolvePath } from "./path.ts";
import { getMIME } from "./filetype.ts";
import { until } from "./async.ts";

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
    if (!isBrowserWindow) {
        return;
    }

    let server: Server;
    let port = 12345;

    before(async () => {
        await new Promise<void>(resolve => {
            server = createServer((req, res) => {
                const pathname = req.url!;
                const filename = resolvePath(pathname.slice(1));

                if (existsSync(filename)) {
                    res.writeHead(200, { "Content-Type": getMIME(extname(filename)) });
                    createReadStream(filename).pipe(res);
                } else {
                    res.writeHead(404);
                    res.end();
                }
            }).listen(port, () => {
                resolve();
            });
        });
    });

    after(() => {
        server.close();
    });

    it("importScript", async () => {
        const url = `http://localhost:${port}/bundle/jsext.js`;

        // Don't wait here because JSDOM doesn't actually load the script.
        importScript(url);

        const script = await until(
            () => document.querySelector<HTMLScriptElement>(`script[data-src='${url}']`)
        );
        ok(script !== null);
        ok(script.src.startsWith("blob:"));
        strictEqual(script.type, "text/javascript");
    });

    it("importScript (module)", async () => {
        const url = `http://localhost:${port}/examples/worker.mjs`;

        // Don't wait here because JSDOM doesn't actually load the script.
        importScript(url, { type: "module" });

        const script = await until(
            () => document.querySelector<HTMLScriptElement>(`script[data-src='${url}']`)
        );
        ok(script !== null);
        ok(script.src.startsWith("blob:"));
        strictEqual(script.type, "module");
    });

    it("importStylesheet", async () => {
        const url = `http://localhost:${port}/examples/styles.css`;

        // Don't wait here because JSDOM doesn't actually load the stylesheet.
        importStylesheet(url);

        const link = await until(
            () => document.querySelector<HTMLLinkElement>(`link[data-src='${url}']`)
        );
        ok(link !== null);
        ok(link.href.startsWith("blob:"));
        strictEqual(link.rel, "stylesheet");
    });
});
