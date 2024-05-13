/**
 * Common options for file system operations.
 */
export type CommonOptions = {
    /**
     * The root directory handle to operate in. This option is only available in
     * the browser, usually obtained from `window.showDirectoryPicker()`. If not
     * provided, the result of `navigator.storage.getDirectory()` will be used.
     */
    root?: FileSystemDirectoryHandle | undefined;
};

/**
 * Information about a directory entry.
 */
export interface DirEntry {
    name: string;
    kind: "file" | "directory" | "symlink";
    /**
     * The relative path of the entry. This is an empty string if the entry is
     * the root directory.
     */
    path: string;
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
     * The size of the file in bytes. The value may be `0` if this is a
     * directory.
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
