import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import { builtinModules } from "module";

export default [
    {
        input: "bundle.ts",
        output: {
            file: "bundle/index.js",
            format: "umd",
            name: "@ayonli/jsext",
            sourcemap: true,
        },
        plugins: [
            typescript({ moduleResolution: "bundler" }),
            resolve({ preferBuiltins: true }),
            commonjs({ ignoreDynamicRequires: true, ignore: builtinModules }),
            terser()
        ],
    },
    {
        input: "worker.mjs",
        output: {
            file: "bundle/worker.mjs",
            format: "es",
        },
        plugins: [
            resolve({ preferBuiltins: true }),
            commonjs({ ignoreDynamicRequires: true, ignore: builtinModules }),
        ],
    },
    {
        input: "worker-web.mjs",
        output: {
            file: "bundle/worker-web.mjs",
            format: "es",
        },
        plugins: [
            resolve({ preferBuiltins: true }),
            commonjs({ ignoreDynamicRequires: true, ignore: builtinModules }),
        ],
    }
];
