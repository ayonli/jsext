import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { builtinModules } from "module";

export default {
    input: 'augment.js',
    output: {
        file: "esm/index.js",
        format: "es",
        compact: true,
        sourcemap: true,
    },
    plugins: [
        resolve({ preferBuiltins: true }),
        commonjs({ ignoreDynamicRequires: true, ignore: builtinModules }),
    ],
};
