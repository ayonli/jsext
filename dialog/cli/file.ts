import { asyncTask } from "../../async.ts";
import { isWSL, which } from "../../cli.ts";
import { Exception, NotSupportedError } from "../../error.ts";
import { createProgressEvent } from "../../event.ts";
import { readDir, readFileAsFile, writeFile } from "../../fs.ts";
import { fixFileType } from "../../fs/util.ts";
import { as, pick } from "../../object.ts";
import { basename, join } from "../../path.ts";
import { platform } from "../../runtime.ts";
import type { ProgressState } from "../progress.ts";
import progress from "./progress.ts";
import { linuxPickFile, linuxPickFiles, linuxPickFolder } from "./file/linux.ts";
import { macPickFile, macPickFiles, macPickFolder } from "./file/mac.ts";
import { windowsPickFile, windowsPickFiles, windowsPickFolder } from "./file/windows.ts";
import type {
    DownloadFileOptions,
    FileDialogOptions,
    PickFileOptions,
    SaveFileOptions,
} from "../file.ts";

function throwUnsupportedPlatformError(): never {
    throw new NotSupportedError("Unsupported platform");
}

export async function pickFile(
    options: PickFileOptions = {}
): Promise<string | null> {
    const _platform = platform();

    if (_platform === "darwin") {
        return await macPickFile(options.title, {
            type: options.type,
            forSave: options?.forSave,
            defaultName: options?.defaultName,
        });
    } else if (_platform === "windows" || isWSL()) {
        return await windowsPickFile(options.title, {
            type: options.type,
            forSave: options?.forSave,
            defaultName: options?.defaultName,
        });
    } else if (_platform === "linux" || await which("zenity")) {
        return await linuxPickFile(options.title, {
            type: options.type,
            forSave: options?.forSave,
            defaultName: options?.defaultName,
        });
    }

    throwUnsupportedPlatformError();
}

export async function pickFiles(
    options: FileDialogOptions = {}
): Promise<string[]> {
    const _platform = platform();

    if (_platform === "darwin") {
        return await macPickFiles(options.title, options.type);
    } else if (_platform === "windows" || isWSL()) {
        return await windowsPickFiles(options.title, options.type);
    } else if (_platform === "linux" || await which("zenity")) {
        return await linuxPickFiles(options.title, options.type);
    }

    throwUnsupportedPlatformError();
}

export async function pickDirectory(
    options: Pick<FileDialogOptions, "title"> = {}
): Promise<string | null> {
    const _platform = platform();

    if (_platform === "darwin") {
        return await macPickFolder(options.title);
    } else if (_platform === "windows" || isWSL()) {
        return await windowsPickFolder(options.title);
    } else if (_platform === "linux" || await which("zenity")) {
        return await linuxPickFolder(options.title);
    }

    throwUnsupportedPlatformError();
}

export async function openFile(options?: FileDialogOptions): Promise<File | null> {
    let filename = await pickFile(options) as string | null;

    if (filename) {
        return await readFileAsFile(filename);
    } else {
        return null;
    }
}

export async function openFiles(options: FileDialogOptions = {}): Promise<File[]> {
    const filenames = await pickFiles(options) as string[];
    return await Promise.all(filenames.map(path => readFileAsFile(path)));
}

export async function openDirectory(
    options: Pick<FileDialogOptions, "title"> = {}
): Promise<File[]> {
    const dirname = await pickDirectory(options) as string | null;

    if (dirname) {
        const files: File[] = [];

        for await (const entry of readDir(dirname, { recursive: true })) {
            if (entry.kind === "file") {
                const path = join(dirname, entry.relativePath);
                const file = await readFileAsFile(path);

                Object.defineProperty(file, "webkitRelativePath", {
                    configurable: true,
                    enumerable: true,
                    writable: false,
                    value: entry.relativePath.replace(/\\/g, "/"),
                });

                files.push(fixFileType(file));
            }
        }

        return files;
    } else {
        return [];
    }
}

export async function saveFile(
    file: File | Blob | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array>,
    options: SaveFileOptions = {}
): Promise<void> {
    const { title } = options;
    let filename: string | null | undefined;

    if (typeof Blob === "function" && file instanceof Blob) {
        filename = await pickFile({
            title,
            type: options.type || file.type,
            forSave: true,
            defaultName: options.name || as(file, File)?.name,
        }) as string | null;
    } else {
        filename = await pickFile({
            title,
            type: options.type,
            forSave: true,
            defaultName: options.name,
        }) as string | null;
    }

    if (filename) {
        await writeFile(filename, file, pick(options, ["signal"]));
    }
}

export async function downloadFile(
    url: string | URL,
    options: DownloadFileOptions = {}
): Promise<void> {
    const src = typeof url === "object" ? url.href : url;
    const name = options.name || basename(src);
    const dest = await pickFile({
        title: options.title,
        type: options.type,
        forSave: true,
        defaultName: name,
    }) as string | null;

    if (!dest) // user canceled
        return;

    const task = asyncTask<void>();
    let signal = options.signal ?? null;
    let result: Promise<void | null>;
    let updateProgress: ((state: ProgressState) => void) | undefined;

    if (options.showProgress) {
        const ctrl = new AbortController();
        signal = ctrl.signal;

        result = progress("Downloading...", async (set) => {
            updateProgress = set;
            return await task;
        }, () => {
            ctrl.abort();
            throw new Exception("Download canceled", { name: "AbortError" });
        });
    } else {
        result = task;
    }

    const res = await fetch(src, { signal });

    if (!res.ok) {
        throw new Error(`Failed to download: ${src}`);
    }

    const size = parseInt(res.headers.get("Content-Length") || "0", 10);
    let stream = res.body!;

    if (options.onProgress || options.showProgress) {
        const { onProgress } = options;
        let loaded = 0;

        const transform = new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
                controller.enqueue(chunk);
                loaded += chunk.byteLength;

                if (onProgress) {
                    try {
                        onProgress?.(createProgressEvent("progress", {
                            lengthComputable: !!size,
                            loaded,
                            total: size ?? 0,
                        }));
                    } catch {
                        // ignore
                    }
                }

                if (updateProgress && size) {
                    updateProgress({
                        percent: loaded / size,
                    });
                }
            },
        });

        stream = stream.pipeThrough(transform);
    }

    writeFile(dest, stream, { signal: signal! }).then(() => {
        task.resolve();
    }).catch(err => {
        task.reject(err);
    });

    await result;
}
