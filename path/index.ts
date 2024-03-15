/**
 * Universal and platform-independent utility functions for dealing with system
 * paths and URLs.
 * @module
 */

import { trim, trimEnd } from "../string/index.ts";

declare const Deno: any;

/** Checks if the given path is a URL, whether standard or non-standard. */
export function isUrl(path: string): boolean {
    return /^[a-z]([a-z\-]+[a-z]|[a-z])?:\/\/\S+/i.test(path);
}

/** Checks if the given path is a Windows specific path. */
export function isWindowsPath(path: string): boolean {
    return /^[a-z]:/.test(path) && path.slice(1, 4) !== "://";
}

/** Checks if the given path is a Posix specific path. */
export function isPosixPath(path: string): boolean {
    return /^\//.test(path);
}

/** Checks if the given path is an absolute path. */
export function isAbsolute(path: string): boolean {
    return isPosixPath(path) || isWindowsPath(path) || isUrl(path);
}

/** Splits the path into well-formed segments. */
export function split(path: string): string[] {
    if (isUrl(path)) {
        const protocol = path.match(/^[a-z]([a-z\-]+[a-z]|[a-z])?:\/\//i)![0];
        const rest = path.slice(protocol.length);
        const { hostname, port, pathname, search, hash } = new URL("http://" + rest);
        const origin = protocol + hostname + (port ? `:${port}` : "");

        if (pathname === "/") {
            if (search && hash) {
                return [origin, search, hash];
            } else if (search) {
                return [origin, search];
            } else if (hash) {
                return [origin, hash];
            } else {
                return [origin];
            }
        } else {
            const segments = trim(pathname, "/").split(/[/\\]+/);
            if (search && hash) {
                return [origin, ...segments, search, hash];
            } else if (search) {
                return [origin, ...segments, search];
            } else if (hash) {
                return [origin, ...segments, hash];
            } else {
                return [origin, ...segments];
            }
        }
    } else if (isWindowsPath(path)) {
        return trimEnd(path, "/\\").split(/[/\\]+/);
    } else if (isPosixPath(path)) {
        const segments = trimEnd(path, "/").split(/\/+/);

        if (segments[0] === "") {
            return ["/", ...segments.slice(1)];
        } else {
            return segments;
        }
    } else { // relative path
        path = trimEnd(path, "/\\");

        if (!path) {
            return [];
        } else if (path[0] === "#") {
            return [path];
        } else if (path[0] === "?") {
            const index = path.indexOf("#");

            if (index === -1) {
                return [path];
            } else {
                return [path.slice(0, index), path.slice(index)];
            }
        } else {
            return path.split(/[/\\]+/);
        }
    }
}

/** Concatenates all given segments into a well-formed path. */
export function join(...segments: string[]): string {
    if (!segments.length) {
        return ".";
    }

    const paths: string[] = [];

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]!;

        for (const _segment of split(segment)) {
            if (_segment === "..") {
                if (paths.length > 1 ||
                    (paths[0] !== "/" && !/^[a-z]:$/i.test(paths[0]!))
                ) {
                    paths.pop();
                }
            } else if (_segment && _segment !== ".") {
                paths.push(_segment);
            }
        }
    }

    let sysSep = "/";

    if (typeof Deno === "object" && typeof Deno.build?.os === "string") { // Deno
        if (Deno.build.os === "windows") {
            sysSep = "\\";
        }
    } else if (typeof process === "object" && !!process.versions?.node) { // Node.js
        if (process.platform === "win32") {
            sysSep = "\\";
        }
    }

    const _isUrl = isUrl(segments[0]!);
    const _isWindowsPath = isWindowsPath(segments[0]!);
    const sep = _isUrl ? "/" : _isWindowsPath ? "\\" : sysSep;
    let url = "";

    for (let i = 0; i < paths.length; i++) {
        const segment = paths[i]!;

        if (segment) {
            if (!url) {
                url = segment;
            } else if (segment[0] === "?" || segment[0] === "#") {
                url += segment;
            } else if (url === "/") {
                url += trim(segment, "/\\");
            } else if (segment) {
                url += sep + trim(segment, "/\\");
            }
        }
    }

    return url || ".";
}

export function normalize(path: string): string {
    path = join(path);
    return /^[a-z]:$/i.test(path) ? path + "\\" : path;
}
