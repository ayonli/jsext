import { isDeno, isNodeLike, isBrowserWindow } from '../env.js';

/**
 * Opens the file picker dialog and pick a file, this function returns the
 * file's path or a `FileSystemFileHandle` in the browser.
 *
 * NOTE: Browser support is limited to the chromium-based browsers.
 *
 * @example
 * ```ts
 * // default usage
 * import { pickFile } from "@ayonli/jsext/dialog";
 *
 * // Node.js, Deno, Bun
 * const filename = await pickFile() as string | null;
 *
 * // Browser (Chrome)
 * const handle = await pickFile() as FileSystemFileHandle | null;
 * ```
 *
 * @example
 * ```ts
 * // filter by MIME type
 * import { pickFile } from "@ayonli/jsext/dialog";
 *
 * // Node.js, Deno, Bun
 * const filename = await pickFile({ type: "image/*" }) as string | null;
 *
 * // Browser (Chrome)
 * const handle = await pickFile({ type: "image/*" }) as FileSystemFileHandle | null;
 * ```
 *
 * @example
 * ```ts
 * // pick for save
 * import { pickFile } from "@ayonli/jsext/dialog";
 *
 * // Node.js, Deno, Bun
 * const filename = await pickFile({
 *     forSave: true,
 *     defaultName: "hello.txt",
 * }) as string | null;
 *
 * // Browser (Chrome)
 * const handle = await pickFile({
 *     forSave: true,
 *     defaultName: "hello.txt",
 * }) as FileSystemFileHandle | null;
 * ```
 */
async function pickFile(options = {}) {
    if (typeof globalThis["showOpenFilePicker"] === "function") {
        const { pickFile } = await import('./web/file.js');
        return await pickFile(options);
    }
    else if (isDeno || isNodeLike) {
        const { pickFile } = await import('./cli/file.js');
        return await pickFile(options);
    }
    throw new Error("Unsupported platform");
}
/**
 * Opens the file picker dialog and pick multiple files, this function returns
 * the paths or `FileSystemFileHandle` objects in the browser of the files
 * selected.
 *
 * NOTE: Browser support is limited to the chromium-based browsers.
 *
 * @example
 * ```ts
 * // default usage
 * import { pickFiles } from "@ayonli/jsext/dialog";
 *
 * // Node.js, Deno, Bun
 * const filenames = await pickFiles() as string[];
 *
 * // Browser (Chrome)
 * const handles = await pickFiles() as FileSystemFileHandle[];
 * ```
 *
 * @example
 * ```ts
 * // filter by MIME type
 * import { pickFiles } from "@ayonli/jsext/dialog";
 *
 * // Node.js, Deno, Bun
 * const filenames = await pickFiles({ type: "image/*" }) as string[];
 *
 * // Browser (Chrome)
 * const handles = await pickFiles({ type: "image/*" }) as FileSystemFileHandle[];
 * ```
 */
async function pickFiles(options = {}) {
    if (typeof globalThis["showOpenFilePicker"] === "function") {
        const { pickFiles } = await import('./web/file.js');
        return await pickFiles(options);
    }
    else if (isDeno || isNodeLike) {
        const { pickFiles } = await import('./cli/file.js');
        return await pickFiles(options);
    }
    throw new Error("Unsupported platform");
}
/**
 * Opens the file picker dialog and pick a directory, this function returns the
 * directory's path or `FileSystemDirectoryHandle` in the browser.
 *
 * NOTE: Browser support is limited to the chromium-based browsers.
 *
 * @example
 * ```ts
 * import { pickDirectory } from "@ayonli/jsext/dialog";
 *
 * // Node.js, Deno, Bun
 * const dirname = await pickDirectory() as string | null;
 *
 * // Browser (Chrome)
 * const handle = await pickDirectory() as FileSystemDirectoryHandle | null;
 * ```
 */
async function pickDirectory(options = {}) {
    if (typeof globalThis["showDirectoryPicker"] === "function") {
        const { pickDirectory } = await import('./web/file.js');
        return await pickDirectory();
    }
    else if (isDeno || isNodeLike) {
        const { pickDirectory } = await import('./cli/file.js');
        return await pickDirectory(options);
    }
    throw new Error("Unsupported platform");
}
async function openFile(options = {}) {
    const { title = "", type = "", multiple = false, directory = false } = options;
    if (directory) {
        return await openDirectory({ title });
    }
    else if (multiple) {
        return await openFiles({ title, type });
    }
    if (isBrowserWindow) {
        const { openFile } = await import('./web/file.js');
        return await openFile(options);
    }
    else if (isDeno || isNodeLike) {
        const { openFile } = await import('./cli/file.js');
        return await openFile(options);
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
/**
 * Opens the file picker dialog and selects multiple files to open.
 *
 * @example
 * ```ts
 * // default usage
 * import { openFiles } from "@ayonli/jsext/dialog";
 *
 * const files = await openFiles();
 *
 * if (files.length > 0) {
 *     console.log(`You selected: ${files.map(file => file.name).join(", ")}`);
 * }
 * ```
 *
 * @example
 * ```ts
 * // filter by MIME type
 * import { openFiles } from "@ayonli/jsext/dialog";
 *
 * const files = await openFiles({ type: "image/*" });
 *
 * if (files.length > 0) {
 *     console.log(`You selected: ${files.map(file => file.name).join(", ")}`);
 *     console.assert(files.every(file => file.type.startsWith("image/")));
 * }
 * ```
 */
async function openFiles(options = {}) {
    if (isBrowserWindow) {
        const { openFiles } = await import('./web/file.js');
        return await openFiles(options);
    }
    else if (isDeno || isNodeLike) {
        const { openFiles } = await import('./cli/file.js');
        return await openFiles(options);
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
/**
 * Opens the directory picker dialog and selects all its files to open.
 *
 * @example
 * ```ts
 * import { openDirectory } from "@ayonli/jsext/dialog";
 *
 * const files = await openDirectory();
 *
 * for (const file of files) {
 *     console.log(`File name: ${file.name}, path: ${file.webkitRelativePath}`);
 * }
 * ```
 */
async function openDirectory(options = {}) {
    if (isBrowserWindow) {
        const { openDirectory } = await import('./web/file.js');
        return await openDirectory();
    }
    else if (isDeno || isNodeLike) {
        const { openDirectory } = await import('./cli/file.js');
        return await openDirectory(options);
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
async function saveFile(file, options = {}) {
    if (isBrowserWindow) {
        const { saveFile } = await import('./web/file.js');
        return await saveFile(file, options);
    }
    else if (isDeno || isNodeLike) {
        const { saveFile } = await import('./cli/file.js');
        return await saveFile(file, options);
    }
    else {
        throw new Error("Unsupported runtime");
    }
}
/**
 * Downloads the file of the given URL to the file system.
 *
 * In the CLI, this function will open a dialog to let the user choose the
 * location where the file will be saved. In the browser, the file will be saved
 * to the default download location, or the browser will prompt the user to
 * choose a location.
 *
 * NOTE: This function depends on the Fetch API and Web Streams API, in Node.js,
 * it requires Node.js v18.0 or above.
 *
 * @example
 * ```ts
 * import { downloadFile } from "@ayonli/jsext/dialog";
 *
 * await downloadFile("https://ayonli.github.io/jsext/README.md");
 * ```
 */
async function downloadFile(url, options = {}) {
    if (isBrowserWindow) {
        const { downloadFile } = await import('./web/file.js');
        return downloadFile(url, options);
    }
    else if (!isDeno && !isNodeLike || typeof fetch !== "function") {
        throw new Error("Unsupported runtime");
    }
    const { downloadFile } = await import('./cli/file.js');
    return downloadFile(url, options);
}

export { downloadFile, openDirectory, openFile, openFiles, pickDirectory, pickFile, pickFiles, saveFile };
//# sourceMappingURL=file.js.map
