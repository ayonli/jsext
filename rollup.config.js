import { glob } from "glob";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { builtinModules } from "node:module";
import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";

const moduleEntries = Object.fromEntries(
    glob.sync("**/*.ts", {
        ignore: [
            "**/*.d.ts",
            "node_modules/**",
            "examples/**",
            "**/*.test.ts",
            "**/test-*.ts",
            "bundle.ts",
            "worker.ts",
            "worker-node.ts"
        ],
    }).map(file => [
        file.slice(0, file.length - extname(file).length),
        fileURLToPath(new URL(file, import.meta.url))
    ])
);

/**
 * @returns {import("rollup").Plugin}
 */
function writePackageJson() {
    return {
        name: "write-package-json",
        generateBundle: async (options) => {
            if (!["cjs", "esm", "es"].includes(options.format)) return;

            const pkg = { type: options.format === "cjs" ? "commonjs" : "module" };

            if (!existsSync(options.dir)) {
                await mkdir(options.dir, { recursive: true });
            }

            await writeFile(join(options.dir, "package.json"), JSON.stringify(pkg));
        },
    };
}

/**
 * @param {string} id 
 */
function isExternal(id) {
    return builtinModules.includes(id)
        || id.includes("node_modules")
        || id.startsWith("npm:")
        || id.startsWith("jsr:");
}

/** @type {import ("rollup").RollupOptions[]} */
const config = [
    { // CommonJS
        input: moduleEntries,
        output: {
            dir: "cjs",
            format: "cjs",
            exports: "named",
            sourcemap: true,
            preserveModules: true,
            preserveModulesRoot: ".",
        },
        plugins: [
            typescript(),
            resolve({ preferBuiltins: true }),
            commonjs({ ignoreDynamicRequires: true, ignore: isExternal }),
            writePackageJson(),
        ],
        external: isExternal,
    },
    { // ES Module
        input: moduleEntries,
        output: {
            dir: "esm",
            format: "esm",
            sourcemap: true,
            preserveModules: true,
            preserveModulesRoot: ".",
        },
        plugins: [
            typescript(),
            resolve({ preferBuiltins: true }),
            commonjs({ ignoreDynamicRequires: true, ignore: isExternal }),
            writePackageJson(),
        ],
        external: isExternal,
    },
    { // Bundle
        input: "bundle.ts",
        output: {
            file: "bundle/jsext.js",
            format: "umd",
            name: "jsext",
            sourcemap: true,
            inlineDynamicImports: true,
        },
        plugins: [
            typescript(),
            resolve({ preferBuiltins: true }),
            commonjs({ ignoreDynamicRequires: true, ignore: isExternal }),
            terser({
                keep_classnames: true,
                keep_fnames: true,
            })
        ],
        external: isExternal,
    },
    { // Worker for Bun, Deno and the browser
        input: "worker.ts",
        output: {
            file: "bundle/worker.mjs",
            format: "esm",
        },
        plugins: [
            typescript(),
            resolve({ preferBuiltins: true }),
            commonjs({ ignoreDynamicRequires: true, ignore: isExternal }),
        ],
        external: isExternal,
    },
    { // Worker for Node.js
        input: "worker-node.ts",
        output: {
            file: "bundle/worker-node.mjs",
            format: "esm",
        },
        plugins: [
            typescript(),
            resolve({ preferBuiltins: true }),
            commonjs({ ignoreDynamicRequires: true, ignore: isExternal }),
        ],
        external: isExternal,
    }
];

export default config;
