import path from "path";
import { glob } from "glob";
import { fileURLToPath } from "url";
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { builtinModules } from "module";
import MagicString from "magic-string";

export default {
    input: Object.fromEntries(
        glob.sync('**/*.ts', {
            ignore: ['node_modules/**', "**/*.test.ts", "bundle.ts"],
        }).map(file => [
            file.slice(0, file.length - path.extname(file).length),
            fileURLToPath(new URL(file, import.meta.url))
        ])
    ),
    output: {
        dir: "esm",
        format: "es",
        sourcemap: true,
        preserveModules: true,
        preserveModulesRoot: '.',
        entryFileNames: (chunkInfo) => {
            if (chunkInfo.name.includes('node_modules')) {
                return chunkInfo.name.replace('node_modules', '_external') + '.js';
            }

            return '[name].js';
        }
    },
    plugins: [
        typescript({ moduleResolution: "bundler" }),
        resolve({ preferBuiltins: true }),
        commonjs({ ignoreDynamicRequires: true, ignore: builtinModules }),
        {
            name: "replace-filename-filepath",
            renderChunk(_code) {
                const code = String(_code);
                const placeholder = `"file://{__filename}"`;

                if (code.includes(placeholder)) {
                    const str = new MagicString(code);
                    str.replaceAll(`"file://{__filename}"`, "import.meta.url");
                    return {
                        code: str.toString(),
                        map: str.generateMap(),
                    };
                }

                return null;
            },
        },
    ],
};
