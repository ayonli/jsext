import { throwUnsupportedRuntimeError } from "@jsext/error";
import type {
    DialogOptions,
    DownloadFileOptions,
    FileDialogOptions,
    PickFileOptions,
    ProgressAbortHandler,
    ProgressFunc,
    ProgressState,
    PromptOptions,
    SaveFileOptions,
} from "./index.ts";

export type {
    DialogOptions,
    DownloadFileOptions,
    FileDialogOptions,
    PickFileOptions,
    ProgressAbortHandler,
    ProgressFunc,
    ProgressState,
    PromptOptions,
    SaveFileOptions,
};

export async function alert(message: string, options: DialogOptions = {}): Promise<void> {
    void message, options;
    throwUnsupportedRuntimeError();
}

export async function confirm(message: string, options: DialogOptions = {}): Promise<boolean> {
    void message, options;
    throwUnsupportedRuntimeError();
}

export async function prompt(
    message: string,
    defaultValue?: string | undefined
): Promise<string | null>;
export async function prompt(message: string, options?: PromptOptions): Promise<string | null>;
export async function prompt(
    message: string,
    options: string | PromptOptions = ""
): Promise<string | null> {
    void message, options;
    throwUnsupportedRuntimeError();
}

export async function progress<T>(
    message: string,
    fn: ProgressFunc<T>,
    onAbort: ProgressAbortHandler<T> | undefined = undefined
): Promise<T | null> {
    void message, fn, onAbort;
    throwUnsupportedRuntimeError();
}

export async function pickFile(
    options: PickFileOptions = {}
): Promise<string | FileSystemFileHandle | null> {
    void options;
    throwUnsupportedRuntimeError();
}

export async function pickFiles(
    options: FileDialogOptions = {}
): Promise<string[] | FileSystemFileHandle[]> {
    void options;
    throwUnsupportedRuntimeError();
}

export async function pickDirectory(
    options: Pick<FileDialogOptions, "title"> = {}
): Promise<string | FileSystemDirectoryHandle | null> {
    void options;
    throwUnsupportedRuntimeError();
}

export function openFile(options?: FileDialogOptions): Promise<File | null> {
    void options;
    throwUnsupportedRuntimeError();
}

export async function openFiles(options: FileDialogOptions = {}): Promise<File[]> {
    void options;
    throwUnsupportedRuntimeError();
}

export async function openDirectory(
    options: Pick<FileDialogOptions, "title"> = {}
): Promise<File[]> {
    void options;
    throwUnsupportedRuntimeError();
}

export async function saveFile(file: File, options?: Pick<SaveFileOptions, "title">): Promise<void>;
export async function saveFile(
    file: Blob | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array>,
    options?: SaveFileOptions
): Promise<void>;
export async function saveFile(
    file: File | Blob | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array>,
    options: SaveFileOptions = {}
): Promise<void> {
    void file, options;
    throwUnsupportedRuntimeError();
}

export async function downloadFile(
    url: string | URL,
    options: DownloadFileOptions = {}
): Promise<void> {
    void url, options;
    throwUnsupportedRuntimeError();
}
