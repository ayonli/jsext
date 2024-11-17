import { isBrowserWindow, isDeno, isNodeLike } from "../env.ts";

/**
 * Options for file dialog functions, such as {@link pickFile} and
 * {@link openFile}.
 */
export interface FileDialogOptions {
    /**
     * Customize the dialog's title. This option is ignored in the browser.
     */
    title?: string | undefined;
    /**
     * Filter files by providing a MIME type or suffix, multiple types can be
     * separated via `,`.
     */
    type?: string | undefined;
}

/**
 * Options for the {@link pickFile} function.
 */
export interface PickFileOptions extends FileDialogOptions {
    /** Open the dialog in save mode. */
    forSave?: boolean;
    /** The default name of the file to save when `forSave` is set. */
    defaultName?: string | undefined;
}

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
export async function pickFile(
    options: PickFileOptions = {}
): Promise<string | FileSystemFileHandle | null> {
    if (typeof (globalThis as any)["showOpenFilePicker"] === "function") {
        const { pickFile } = await import("./web/file.ts");
        return await pickFile(options);
    } else if (isDeno || isNodeLike) {
        const { pickFile } = await import("./cli/file.ts");
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
export async function pickFiles(
    options: FileDialogOptions = {}
): Promise<string[] | FileSystemFileHandle[]> {
    if (typeof (globalThis as any)["showOpenFilePicker"] === "function") {
        const { pickFiles } = await import("./web/file.ts");
        return await pickFiles(options);
    } else if (isDeno || isNodeLike) {
        const { pickFiles } = await import("./cli/file.ts");
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
export async function pickDirectory(
    options: Pick<FileDialogOptions, "title"> = {}
): Promise<string | FileSystemDirectoryHandle | null> {
    if (typeof (globalThis as any)["showDirectoryPicker"] === "function") {
        const { pickDirectory } = await import("./web/file.ts");
        return await pickDirectory();
    } else if (isDeno || isNodeLike) {
        const { pickDirectory } = await import("./cli/file.ts");
        return await pickDirectory(options);
    }

    throw new Error("Unsupported platform");
}

/**
 * Opens the file picker dialog and selects a file to open.
 * 
 * @example
 * ```ts
 * // default usage
 * import { openFile } from "@ayonli/jsext/dialog";
 * 
 * const file = await openFile();
 * 
 * if (file) {
 *     console.log(`You selected: ${file.name}`);
 * }
 * ```
 * 
 * @example
 * ```ts
 * // filter by MIME type
 * import { openFile } from "@ayonli/jsext/dialog";
 * 
 * const file = await openFile({ type: "image/*" });
 * 
 * if (file) {
 *     console.log(`You selected: ${file.name}`);
 *     console.assert(file.type.startsWith("image/"));
 * }
 * ```
 */
export function openFile(options?: FileDialogOptions): Promise<File | null>;
/**
 * Opens the file picker dialog and selects multiple files to open.
 * 
 * @deprecated use {@link openFiles} instead.
 */
export function openFile(options: FileDialogOptions & {
    multiple: true;
}): Promise<File[]>;
/**
 * Opens the directory picker dialog and selects all its files.
 * 
 * @deprecated use {@link openDirectory} instead.
 */
export function openFile(options: Pick<FileDialogOptions, "title"> & {
    directory: true;
}): Promise<File[]>;
export async function openFile(options: FileDialogOptions & {
    multiple?: boolean;
    directory?: boolean;
} = {}): Promise<File | File[] | null> {
    const { title = "", type = "", multiple = false, directory = false } = options;

    if (directory) {
        return await openDirectory({ title });
    } else if (multiple) {
        return await openFiles({ title, type });
    }

    if (isBrowserWindow) {
        const { openFile } = await import("./web/file.ts");
        return await openFile(options);
    } else if (isDeno || isNodeLike) {
        const { openFile } = await import("./cli/file.ts");
        return await openFile(options);
    } else {
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
export async function openFiles(options: FileDialogOptions = {}): Promise<File[]> {
    if (isBrowserWindow) {
        const { openFiles } = await import("./web/file.ts");
        return await openFiles(options);
    } else if (isDeno || isNodeLike) {
        const { openFiles } = await import("./cli/file.ts");
        return await openFiles(options);
    } else {
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
export async function openDirectory(
    options: Pick<FileDialogOptions, "title"> = {}
): Promise<File[]> {
    if (isBrowserWindow) {
        const { openDirectory } = await import("./web/file.ts");
        return await openDirectory();
    } else if (isDeno || isNodeLike) {
        const { openDirectory } = await import("./cli/file.ts");
        return await openDirectory(options);
    } else {
        throw new Error("Unsupported runtime");
    }
}

/**
 * Options for the {@link saveFile} function.
 */
export interface SaveFileOptions {
    /**
     * Customize the dialog's title. This option is ignored in the browser.
     */
    title?: string;
    /** The suggested name of the file. */
    name?: string;
    /** The MIME type of the file. */
    type?: string;
    signal?: AbortSignal;
}

/**
 * Saves a file to the file system.
 * 
 * In the CLI, this function will open a dialog to let the user choose the
 * location where the file will be saved. In the browser, the file will be saved
 * to the default download location, or the browser will prompt the user to
 * choose a location.
 * 
 * @example
 * ```ts
 * import { saveFile } from "@ayonli/jsext/dialog";
 * 
 * const file = new File(["Hello, World!"], "hello.txt", { type: "text/plain" });
 * 
 * await saveFile(file);
 * ```
 */
export async function saveFile(file: File, options?: Pick<SaveFileOptions, "title">): Promise<void>;
/**
 * @example
 * ```ts
 * import { saveFile } from "@ayonli/jsext/dialog";
 * import bytes from "@ayonli/jsext/bytes";
 * 
 * const data = bytes("Hello, World!");
 * 
 * await saveFile(data, { name: "hello.txt", type: "text/plain" });
 * ```
 */
export async function saveFile(
    file: Blob | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array>,
    options?: SaveFileOptions
): Promise<void>;
export async function saveFile(
    file: File | Blob | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array>,
    options: SaveFileOptions = {}
): Promise<void> {
    if (isBrowserWindow) {
        const { saveFile } = await import("./web/file.ts");
        return await saveFile(file, options);
    } else if (isDeno || isNodeLike) {
        const { saveFile } = await import("./cli/file.ts");
        return await saveFile(file, options);
    } else {
        throw new Error("Unsupported runtime");
    }
}

/**
 * Options for the {@link downloadFile} function.
 */
export interface DownloadFileOptions extends SaveFileOptions {
    /**
     * A callback function that will be called when the download progress
     * changes.
     */
    onProgress?: (event: ProgressEvent) => void;
    /**
     * Displays a progress bar during the download process. This option shadows
     * the `signal` option if provided, as the progress bar has its own
     * cancellation mechanism.
     */
    showProgress?: boolean;
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
export async function downloadFile(
    url: string | URL,
    options: DownloadFileOptions = {}
): Promise<void> {
    if (isBrowserWindow) {
        const { downloadFile } = await import("./web/file.ts");
        return downloadFile(url, options);
    } else if (!isDeno && !isNodeLike || typeof fetch !== "function") {
        throw new Error("Unsupported runtime");
    }

    const { downloadFile } = await import("./cli/file.ts");
    return downloadFile(url, options);
}
