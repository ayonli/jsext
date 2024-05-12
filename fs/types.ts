/**
 * Information about a directory entry.
 */
export interface DirEntry {
    name: string;
    kind: "file" | "directory" | "symlink";
    /** The relative path of the entry */
    path: string;
    handle?: FileSystemFileHandle | FileSystemDirectoryHandle;
}

/**
 * Information about a file or directory.
 */
export interface FileInfo {
    name: string;
    kind: "file" | "directory" | "symlink";
    /**
     * The size of the file in bytes. The value may be `0` if this is a directory.
     */
    size: number;
    /**
     * The MIME type of the file. If the MIME type cannot be determined, this
     * value will be an empty string.
     */
    type: string;
    /**
     * The last modified time of the file. This value may be `null` on
     * unsupported platform.
     */
    mtime: Date | null;
    /**
     * The last accessed time of the file. This value may be `null` on
     * unsupported platform.
     */
    atime: Date | null;
    /**
     * The creation time of the file. This value may be `null` on unsupported
     * platform.
     */
    birthtime: Date | null;
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
