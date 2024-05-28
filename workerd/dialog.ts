import type { ProgressState, ProgressFunc, ProgressAbortHandler } from "../dialog/progress.ts";

export { ProgressState, ProgressFunc, ProgressAbortHandler };

export async function alert(message: string, options: {
    gui?: boolean;
} = {}): Promise<void> {
    void message, options;
    throw new Error("Unsupported runtime");
}

export async function confirm(message: string, options: {
    gui?: boolean;
} = {}): Promise<boolean> {
    void message, options;
    throw new Error("Unsupported runtime");
}

export async function prompt(
    message: string,
    defaultValue?: string | undefined
): Promise<string | null>;
export async function prompt(message: string, options?: {
    defaultValue?: string | undefined;
    type?: "text" | "password";
    mask?: string;
    gui?: boolean;
}): Promise<string | null>;
export async function prompt(message: string, options: string | {
    defaultValue?: string | undefined;
    type?: "text" | "password";
    mask?: string;
    gui?: boolean;
} = ""): Promise<string | null> {
    void message, options;
    throw new Error("Unsupported runtime");
}

export async function progress<T>(
    message: string,
    fn: ProgressFunc<T>,
    onAbort: ProgressAbortHandler<T> | undefined = undefined
): Promise<T | null> {
    void message, fn, onAbort;
    throw new Error("Unsupported runtime");
}

export function openFile(options?: {
    title?: string;
    type?: string;
}): Promise<File | null>;
export function openFile(options: {
    title?: string;
    type?: string;
    multiple: true;
}): Promise<File[]>;
export function openFile(options: {
    title?: string;
    directory: true;
}): Promise<File[]>;
export async function openFile(options: {
    title?: string;
    type?: string;
    multiple?: boolean;
    directory?: boolean;
} = {}): Promise<File | File[] | null> {
    void options;
    throw new Error("Unsupported runtime");
}

export async function pickFile(options: {
    title?: string | undefined;
    type?: string | undefined;
    forSave?: boolean;
    defaultName?: string | undefined;
} = {}): Promise<string | null> {
    void options;
    throw new Error("Unsupported runtime");
}

export async function pickFiles(options: {
    title?: string;
    type?: string;
} = {}): Promise<string[]> {
    void options;
    throw new Error("Unsupported runtime");
}

export async function pickDirectory(options: {
    title?: string;
} = {}): Promise<string | null> {
    void options;
    throw new Error("Unsupported runtime");
}

export async function saveFile(file: File, options?: {
    title?: string;
}): Promise<void>;
export async function saveFile(
    file: Blob | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array>,
    options: {
        name: string;
        type?: string;
        title?: string;
    }
): Promise<void>;
export async function saveFile(
    file: File | Blob | ArrayBuffer | ArrayBufferView | ReadableStream<Uint8Array>,
    options: {
        title?: string;
        name?: string;
        type?: string;
    } = {}
): Promise<void> {
    void file, options;
    throw new Error("Unsupported runtime");
}
