/**
 * Platform-independent utility functions for dealing with system paths and URLs.
 * @experimental
 * @module
 */

import { stripEnd, trim } from "../string/index.ts";
import {
    isAbsolute,
    isFileProtocol,
    isFileUrl,
    isNotQuery,
    isPosixPath,
    isSubPath,
    isUrl,
    isVolume,
    isWindowsPath,
    split,
} from "./util.ts";

export { isWindowsPath, isPosixPath, isUrl, isFileUrl, isAbsolute, isSubPath };

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

/**
 * Concatenates all given `segments` into a well-formed path.
 * @experimental
 */
export function join(...segments: string[]): string {
    segments = segments.filter(s => s !== "");

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
            } else if (isVolume(path)) {
                path += isVolume(path, true) ? "\\" + segment : segment;
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
    segments = segments.filter(s => s !== "");
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

    return _normalize(..._paths);
}

function _normalize(...segments: string[]): string {
    const path = join(...segments);
    return isFileProtocol(path) ? path + "/" : path;
}

/**
 * Normalizes the given `path`, resolving `..` and `.` segments. Note that
 * resolving these segments does not necessarily mean that all will be
 * eliminated. A `..` at the top-level will be preserved, and an empty path is
 * canonically `.`.
 * @experimental
 */
export function normalize(path: string): string {
    return _normalize(path);
}

/**
 * Returns the parent path of the given `path`.
 * @experimental
 */
export function dirname(path: string): string {
    if (isUrl(path)) {
        const { protocol, host, pathname } = new URL(path);
        const origin = protocol + "//" + host;
        const _dirname = dirname(pathname);

        if (_dirname === "/") {
            return isFileProtocol(origin) ? origin + "/" : origin;
        } else {
            return origin + _dirname;
        }
    } else {
        const segments = split(path).filter(isNotQuery);
        const last = segments.pop()!;

        if (segments.length) {
            return join(...segments);
        } else if (last === "/") {
            return "/";
        } else if (isVolume(last, true)) {
            return last + "\\";
        } else if (isVolume(last)) {
            return last;
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
        const { pathname } = new URL(path);
        return basename(pathname, suffix);
    } else {
        const segments = split(path).filter(isNotQuery);
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
