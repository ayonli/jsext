import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { builtinModules } from "module";

export default {
    input: 'worker-web.mjs',
    output: {
        file: "esm/worker-web.mjs",
        format: "es",
    },
    plugins: [
        resolve({ preferBuiltins: true }),
        commonjs({ ignoreDynamicRequires: true, ignore: builtinModules }),
    ],
};
