import path from "path";
import { glob } from "glob";
import { fileURLToPath } from "url";
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { builtinModules } from "module";

export default {
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
    ],
};
