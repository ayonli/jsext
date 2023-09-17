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
        glob.sync('src/**/*.ts').filter(file => !file.endsWith(".test.ts")).map(file => [
            // This remove `src/` as well as the file extension from each
            // file, so e.g. src/nested/foo.js becomes nested/foo
            path.relative(
                'src',
                file.slice(0, file.length - path.extname(file).length)
            ),
            // This expands the relative paths to absolute paths, so e.g.
            // src/nested/foo becomes /project/src/nested/foo.js
            fileURLToPath(new URL(file, import.meta.url))
        ])
    ),
    output: {
        dir: "esm",
        format: "es",
        sourcemap: true,
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: (chunkInfo) => {
            if (chunkInfo.name.includes('node_modules')) {
                return chunkInfo.name.replace('node_modules', '_external') + '.js';
            }

            return '[name].js';
        }
    },
    plugins: [
        typescript({
            module: "esnext",
            outDir: "esm",
            declaration: false,
        }),
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
