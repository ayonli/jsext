import { glob } from "glob";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
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

export default [
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
            commonjs({ ignoreDynamicRequires: true, ignore: builtinModules }),
        ],
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
            commonjs({ ignoreDynamicRequires: true, ignore: builtinModules }),
        ],
    },
    { // Bundle
        input: "bundle.ts",
        output: {
            file: "bundle/jsext.js",
            format: "umd",
            name: "jsext",
            sourcemap: true,
        },
        plugins: [
            typescript(),
            resolve({ preferBuiltins: true }),
            commonjs({ ignoreDynamicRequires: true, ignore: builtinModules }),
            terser({
                keep_classnames: true,
                keep_fnames: true,
            })
        ],
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
            commonjs({ ignoreDynamicRequires: true, ignore: builtinModules }),
        ],
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
            commonjs({ ignoreDynamicRequires: true, ignore: builtinModules }),
        ],
    }
];
