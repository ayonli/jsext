import type { KVNamespace } from "../workerd/types.ts";

/**
 * Common options for file system operations.
 */
export interface FileSystemOptions {
    /**
     * The root directory handle to operate in, used in the browser, usually
     * obtained from `window.showDirectoryPicker()`. If not provided, the result
     * of `navigator.storage.getDirectory()` will be used.
     * 
     * This option can also be set to a KV namespace in Cloudflare Workers,
     * however, Cloudflare Workers support is very limited and is experimental.
     * When setting, this option is usually obtained from the `__STATIC_CONTENT`
     * binding, or if not provided, the global `__STATIC_CONTENT` will be used
     * (when available).
     */
    root?: FileSystemDirectoryHandle | KVNamespace | undefined;
}

/**
 * Information about a directory entry.
 */
export interface DirEntry {
    name: string;
    kind: "file" | "directory" | "symlink";
    /**
     * The relative path of the entry. This is an empty string if the entry is
     * the root directory.
     * 
     * NOTE: The separator of the path is platform-specific, it's `\` in Windows
     * server-side applications, and `/` elsewhere.
     */
    relativePath: string;
    /**
     * The raw file system handle of the entry, only available in the browser.
     */
    handle?: FileSystemFileHandle | FileSystemDirectoryHandle | undefined;
}

export interface DirTree extends DirEntry {
    /**
     * The child nodes of the current entry. this is `undefined` if the entry is
     * a file.
     */
    children?: DirTree[];
}

/**
 * Information about a file or directory.
 */
export interface FileInfo {
    name: string;
    kind: "file" | "directory" | "symlink";
    /**
     * The size of the file in bytes. This value may be `0` if this is a
     * directory or the size cannot be determined.
     */
    size: number;
    /**
     * The MIME type of the file. If the MIME type cannot be determined, this
     * value will be an empty string.
     */
    type: string;
    /**
     * The last modified time of the file. This value may be `null` on
     * unsupported platforms.
     */
    mtime: Date | null;
    /**
     * The last accessed time of the file. This value may be `null` on
     * unsupported platforms.
     */
    atime: Date | null;
    /**
     * The creation time of the file. This value may be `null` on unsupported
     * platforms.
     */
    birthtime: Date | null;
    /**
     * The permission mode of the file. This value may be `0` on unsupported
     * platforms.
     */
    mode: number;
    /**
     * User ID of the owner of the file. This value may be `0` on unsupported
     * platforms.
     */
    uid: number;
    /**
     * Group ID of the owner of the file. This value may be `0` on unsupported
     * platforms.
     */
    gid: number;
    /**
     * Whether the file is a block device.
     */
    isBlockDevice: boolean;
    /**
     * Whether the file is a character device.
     */
    isCharDevice: boolean;
    /**
     * Whether the file is a FIFO (named pipe).
     */
    isFIFO: boolean;
    /**
     * Whether the file is a UNIX socket.
     */
    isSocket: boolean;
}
