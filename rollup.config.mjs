import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { builtinModules } from "module";
import { fileURLToPath } from 'url';
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
global["__filename"] = __filename;
global["__dirname"] = dirname(__filename);

export default {
    input: 'augment.js',
    output: {
        file: "esm/index.mjs",
        format: "es",
        compact: true,
        sourcemap: true,
    },
    plugins: [
        resolve({ preferBuiltins: true }),
        commonjs({ ignoreDynamicRequires: true, ignore: builtinModules }),
    ],
};
