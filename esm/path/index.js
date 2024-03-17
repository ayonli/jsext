import { stripEnd, trim } from '../string/index.js';
import { split, isUrl, isPosixPath, isWindowsPath, isNotQuery, isAbsolute, isFileProtocol, isVolume } from './util.js';
export { endsWith, isFileUrl } from './util.js';

/**
 * Platform-independent utility functions for dealing with system paths and URLs.
 * @experimental
 * @module
 */
/**
 * Platform-specific path segment separator.
 * @experimental
 */
const sep = (() => {
    var _a, _b;
    if (typeof Deno === "object" && typeof ((_a = Deno.build) === null || _a === void 0 ? void 0 : _a.os) === "string") { // Deno
        if (Deno.build.os === "windows") {
            return "\\";
        }
    }
    else if (typeof process === "object" && !!((_b = process.versions) === null || _b === void 0 ? void 0 : _b.node)) { // Node.js
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
function cwd() {
    if (typeof Deno === "object" && typeof Deno.cwd === "function") {
        return Deno.cwd();
    }
    else if (typeof process === "object" && typeof process.cwd === "function") {
        return process.cwd();
    }
    else if (typeof location === "object" && location.origin) {
        return location.origin + (location.pathname === "/" ? "" : location.pathname);
    }
    else {
        throw new Error("Unable to determine the current working directory.");
    }
}
/**
 * Concatenates all given `segments` into a well-formed path.
 * @experimental
 */
function join(...segments) {
    segments = segments.filter(s => s !== "");
    if (!segments.length) {
        return ".";
    }
    const paths = [];
    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        for (const _segment of split(segment)) {
            if (_segment === "..") {
                if (!paths.length || paths.every(p => p === "..")) {
                    paths.push("..");
                }
                else if (paths.length > 1 || (paths[0] !== "/" && !isVolume(paths[0]))) {
                    paths.pop();
                }
            }
            else if (_segment && _segment !== ".") {
                paths.push(_segment);
            }
        }
    }
    const start = paths[0];
    const _sep = isUrl(start) || isPosixPath(start) ? "/" : isWindowsPath(start) ? "\\" : sep;
    let path = "";
    for (let i = 0; i < paths.length; i++) {
        const segment = paths[i];
        if (segment) {
            if (!path) {
                path = segment;
            }
            else if (segment[0] === "?" || segment[0] === "#") {
                path += segment;
            }
            else if (path === "/") {
                path += trim(segment, "/\\");
            }
            else if (isVolume(path)) {
                path += isVolume(path, true) ? "\\" + segment : segment;
            }
            else if (segment) {
                path += _sep + trim(segment, "/\\");
            }
        }
    }
    return path || ".";
}
function _normalize(...segments) {
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
function normalize(path) {
    return _normalize(path);
}
/**
 * Similar to {@link normalize}, but also remove the search string and hash string if
 * present.
 */
function sanitize(path) {
    return _normalize(...split(path).filter(isNotQuery));
}
/**
 * Resolves path `segments` into a well-formed path.
 * @experimental
 */
function resolve(...segments) {
    segments = segments.filter(s => s !== "");
    const _cwd = cwd();
    if (!segments.length) {
        return _cwd;
    }
    segments = isAbsolute(segments[0]) ? segments : [_cwd, ...segments];
    let _paths = [];
    for (let i = 0; i < segments.length; i++) {
        const path = segments[i];
        if (isAbsolute(path)) {
            _paths = [];
        }
        _paths.push(path);
    }
    return _normalize(..._paths);
}
/**
 * Returns the parent path of the given `path`.
 * @experimental
 */
function dirname(path) {
    if (isUrl(path)) {
        const { protocol, host, pathname } = new URL(path);
        const origin = protocol + "//" + host;
        const _dirname = dirname(pathname);
        if (_dirname === "/") {
            return isFileProtocol(origin) ? origin + "/" : origin;
        }
        else {
            return origin + _dirname;
        }
    }
    else {
        const segments = split(path).filter(isNotQuery);
        const last = segments.pop();
        if (segments.length) {
            return join(...segments);
        }
        else if (last === "/") {
            return "/";
        }
        else if (isVolume(last, true)) {
            return last + "\\";
        }
        else if (isVolume(last)) {
            return last;
        }
        else {
            return ".";
        }
    }
}
/**
 * Return the last portion of the given `path`. Trailing directory separators
 * are ignored, and optional `suffix` is removed.
 * @experimental
 */
function basename(path, suffix = "") {
    if (isUrl(path)) {
        const { pathname } = new URL(path);
        return basename(pathname, suffix);
    }
    else {
        const segments = split(path).filter(isNotQuery);
        const _basename = segments.pop();
        if (!_basename || _basename === "/" || isVolume(_basename)) {
            return "";
        }
        else if (suffix) {
            return stripEnd(_basename, suffix);
        }
        else {
            return _basename;
        }
    }
}
/**
 * Returns the extension of the `path` with leading period.
 * @experimental
 */
function extname(path) {
    const base = basename(path);
    const index = base.lastIndexOf(".");
    if (index === -1) {
        return "";
    }
    else {
        return base.slice(index);
    }
}

export { basename, cwd, dirname, extname, isAbsolute, isPosixPath, isUrl, isWindowsPath, join, normalize, resolve, sanitize, sep };
//# sourceMappingURL=index.js.map
