/**
 * Platform-independent utility functions for dealing with system paths and URLs.
 * @experimental
 * @module
 */

import { stripEnd, trim, trimEnd } from "../string/index.ts";
import { isFileProtocol } from "../url/util.ts";
import { isUrl, parse as parseUrl } from "../url/index.ts";

declare const Deno: any;

/**
 * Platform-specific path segment separator.
 * @experimental
 */
export const sep: "/" | "\\" = (() => {
    if (typeof Deno === "object" && typeof Deno.build?.os === "string") { // Deno
        if (Deno.build.os === "windows") {
            return "\\";
        }
    } else if (typeof process === "object" && !!process.versions?.node) { // Node.js
        if (process.platform === "win32") {
            return "\\";
        }
    }

    return "/";
})();

/**
 * Returns the current working directory.
 * @experimental
 */
export function cwd(): string {
    if (typeof Deno === "object" && typeof Deno.cwd === "function") {
        return Deno.cwd();
    } else if (typeof process === "object" && typeof process.cwd === "function") {
        return process.cwd();
    } else if (typeof location === "object" && location.origin) {
        return location.origin + (location.pathname === "/" ? "" : location.pathname);
    } else {
        throw new Error("Unable to determine the current working directory.");
    }
}

function isVolume(path: string): boolean {
    return /^[a-z]:$/i.test(path);
}

/**
 * Checks if the given `path` is a Windows specific path.
 * @experimental
 */
export function isWindowsPath(path: string): boolean {
    return /^[a-z]:/.test(path) && path.slice(1, 4) !== "://";
}

/**
 * Checks if the given `path` is a Posix specific path.
 * @experimental
 */
export function isPosixPath(path: string): boolean {
    return /^\//.test(path);
}

/**
 * Checks if the given `path` is an absolute path.
 * @experimental
 */
export function isAbsolute(path: string): boolean {
    return isPosixPath(path) || isWindowsPath(path) || isUrl(path);
}

/**
 * Splits the `path` into well-formed segments.
 * @experimental
 */
export function split(path: string): string[] {
    if (isUrl(path)) {
        const { origin, pathname, search, hash } = parseUrl(path);

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

/**
 * Concatenates all given `segments` into a well-formed path.
 * @experimental
 */
export function join(...segments: string[]): string {
    if (!segments.length) {
        return ".";
    }

    const paths: string[] = [];

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i]!;

        for (const _segment of split(segment)) {
            if (_segment === "..") {
                if (!paths.length || paths.every(p => p === "..")) {
                    paths.push("..");
                } else if (paths.length > 1 || (paths[0] !== "/" && !isVolume(paths[0]!))) {
                    paths.pop();
                }
            } else if (_segment && _segment !== ".") {
                paths.push(_segment);
            }
        }
    }

    const start = paths[0]!;
    const _sep = isUrl(start) || isPosixPath(start) ? "/" : isWindowsPath(start) ? "\\" : sep;
    let path = "";

    for (let i = 0; i < paths.length; i++) {
        const segment = paths[i]!;

        if (segment) {
            if (!path) {
                path = segment;
            } else if (segment[0] === "?" || segment[0] === "#") {
                path += segment;
            } else if (path === "/") {
                path += trim(segment, "/\\");
            } else if (segment) {
                path += _sep + trim(segment, "/\\");
            }
        }
    }

    return path || ".";
}

/**
 * Resolves path `segments` into a well-formed path.
 * @experimental
 */
export function resolve(...segments: string[]): string {
    const _cwd = cwd();

    if (!segments.length) {
        return _cwd;
    }

    segments = isAbsolute(segments[0]!) ? segments : [_cwd, ...segments];
    let _paths: string[] = [];

    for (let i = 0; i < segments.length; i++) {
        const path = segments[i]!;

        if (isAbsolute(path)) {
            _paths = [];
        }

        _paths.push(path);
    }

    const path = join(..._paths);
    return isVolume(path) ? path + "\\" : path;
}

/**
 * Normalizes the given `path`, resolving `..` and `.` segments. Note that
 * resolving these segments does not necessarily mean that all will be
 * eliminated. A `..` at the top-level will be preserved, and an empty path is
 * canonically `.`.
 * @experimental
 */
export function normalize(path: string): string {
    path = join(path);
    return isVolume(path) ? path + "\\" : isFileProtocol(path) ? path + "/" : path;
}

/**
 * Returns the parent path of the given `path`.
 * @experimental
 */
export function dirname(path: string): string {
    if (isUrl(path)) {
        const { origin, pathname } = parseUrl(path);
        const _dirname = dirname(pathname);

        if (_dirname === "/") {
            return isFileProtocol(origin) ? origin + "/" : origin;
        } else {
            return origin + _dirname;
        }
    } else {
        const segments = split(path);
        const last = segments.pop()!;

        if (segments.length) {
            const _dirname = join(...segments);

            if (isVolume(_dirname)) {
                return _dirname + "\\";
            } else {
                return _dirname;
            }
        } else if (last === "/") {
            return "/";
        } else if (isVolume(last)) {
            return last + "\\";
        } else {
            return ".";
        }
    }
}

/**
 * Return the last portion of the given `path`. Trailing directory separators
 * are ignored, and optional `suffix` is removed.
 * @experimental
 */
export function basename(path: string, suffix = ""): string {
    if (isUrl(path)) {
        const { pathname } = parseUrl(path);
        return basename(pathname, suffix);
    } else {
        const segments = split(path);
        const _basename = segments.pop();

        if (!_basename || _basename === "/" || isVolume(_basename)) {
            return "";
        } else if (suffix) {
            return stripEnd(_basename, suffix);
        } else {
            return _basename;
        }
    }
}

/**
 * Returns the extension of the `path` with leading period.
 * @experimental
 */
export function extname(path: string): string {
    const base = basename(path);
    const index = base.lastIndexOf(".");

    if (index === -1) {
        return "";
    } else {
        return base.slice(index);
    }
}
