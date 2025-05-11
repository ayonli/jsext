import { glob } from "glob";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { builtinModules } from "node:module";
import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

/**
 * @param {string} submodule 
 */
function createEntryFiles(submodule) {
    return Object.fromEntries(
        glob.sync(`${submodule}/**/*.ts`, {
            ignore: [
                `${submodule}/**/*.d.ts`,
                "node_modules/**",
                "examples/**",
                `${submodule}**/*.test.ts`,
                `${submodule}/**/test-*.ts`,
                "bundle.ts",
                "worker.ts",
                "worker-node.ts"
            ],
        }).map(file => {
            const _file = file.slice(submodule.length + 1);
            return [
                _file.slice(0, _file.length - extname(_file).length),
                fileURLToPath(new URL(file, import.meta.url))
            ];
        })
    );
}

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
        || id.startsWith("node:")
        || id.startsWith("npm:")
        || id.startsWith("jsr:")
        || id.startsWith("fastly:")
        || id.startsWith("cloudflare:")
        || id.startsWith("@jsext/")
        || id === "__STATIC_CONTENT_MANIFEST";
}

/**
 * 
 * @param {string} submodule 
 * @returns {import("rollup").RollupOptions[]}
 */
function createConfigPair(submodule) {
    const input = createEntryFiles(submodule);
    const hasTsConfig = existsSync(`./${submodule}/tsconfig.json`);
    /**
     * @type {import("rollup").Plugin}
     */
    let cjsTsPlugin;
    /**
     * @type {import("rollup").Plugin}
     */
    let esmTsPlugin;

    if (hasTsConfig) {
        cjsTsPlugin = typescript({
            tsconfig: `${submodule}/tsconfig.json`,
            include: Object.values(input),
            declaration: true,
            declarationDir: `${submodule}/dist`,
            declarationMap: true,
        });
        esmTsPlugin = typescript({
            tsconfig: `${submodule}/tsconfig.json`,
            include: Object.values(input),
        });
    } else {
        cjsTsPlugin = typescript({
            tsconfig: "tsconfig.json",
            rootDir: submodule,
            include: Object.values(input),
            declaration: true,
            declarationDir: `${submodule}/dist`,
            declarationMap: true,
        });
        esmTsPlugin = typescript({
            tsconfig: "tsconfig.json",
            rootDir: submodule,
            include: Object.values(input),
        });
    }

    return [
        { // CommonJS
            input,
            output: {
                dir: `${submodule}/dist`,
                format: "cjs",
                exports: "named",
                sourcemap: true,
                preserveModules: true,
                preserveModulesRoot: ".",
            },
            plugins: [
                cjsTsPlugin,
                resolve({ preferBuiltins: true }),
                commonjs({ ignoreDynamicRequires: true, ignore: isExternal }),
                writePackageJson(),
            ],
            external: isExternal,
        },
        { // ES Module
            input,
            output: {
                dir: `${submodule}/esm`,
                format: "esm",
                sourcemap: true,
                preserveModules: true,
                preserveModulesRoot: ".",
            },
            plugins: [
                esmTsPlugin,
                resolve({ preferBuiltins: true }),
                commonjs({ ignoreDynamicRequires: true, ignore: isExternal }),
                writePackageJson(),
            ],
            external: isExternal,
        }
    ];
}

const moduleName = process.env.MODULE_NAME ?? "";
if (!moduleName) {
    console.error("Please provide a module name.");
    process.exit(1);
}

export default createConfigPair(moduleName);
