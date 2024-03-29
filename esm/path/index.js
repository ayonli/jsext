import { stripEnd, trim } from '../string/index.js';
import { isAbsolute, split, isUrl, isPosixPath, isWindowsPath, isNotQuery, isFileProtocol, isVolume } from './util.js';
export { contains, endsWith, equals, isFileUrl, startsWith } from './util.js';

/**
 * Platform-independent utility functions for dealing with system paths and URLs.
 *
 * The functions in this module are designed to be generic and work in any
 * runtime, whether server-side or browsers. They can be used for both system
 * paths and URLs.
 * @experimental
 * @module
 */
/**
 * Platform-specific path segment separator. The value is `\` on Windows
 * server-side runtime, and `/` otherwise.
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
 *
 * NOTE: in the browser, this function returns the current origin and pathname.
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
 *
 * @example
 * ```ts
 * import { join } from "@ayonli/jsext/path";
 *
 * console.log(join("foo", "bar")); // "foo/bar" or "foo\\bar" on Windows
 * console.log(join("/", "foo", "bar")); // "/foo/bar"
 * console.log(join("C:\\", "foo", "bar")); // "C:\\foo\\bar"
 * console.log(join("file:///foo", "bar", "..")) // "file:///foo"
 *
 * console.log(join("http://example.com", "foo", "bar", "?query"));
 * // "http://example.com/foo/bar?query"
 * ```
 */
function join(...segments) {
    let _paths = [];
    for (let i = 0; i < segments.length; i++) {
        const path = segments[i];
        if (path) {
            if (isAbsolute(path)) {
                _paths = [];
            }
            _paths.push(path);
        }
    }
    const paths = [];
    for (let i = 0; i < _paths.length; i++) {
        let segment = _paths[i];
        for (const _segment of split(segment)) {
            if (_segment === "..") {
                if (!paths.length || paths.every(p => p === "..")) {
                    paths.push("..");
                }
                else if (paths.length > 2
                    || (paths.length === 2 && !isAbsolute(paths[1]))
                    || (paths.length === 1 && !isAbsolute(paths[0]))) {
                    paths.pop();
                }
            }
            else if (_segment && _segment !== ".") {
                paths.push(_segment);
            }
        }
    }
    if (!paths.length) {
        return ".";
    }
    const start = paths[0];
    const _sep = isUrl(start) || isPosixPath(start) ? "/" : isWindowsPath(start) ? "\\" : sep;
    let path = "";
    for (let i = 0; i < paths.length; i++) {
        const segment = paths[i];
        if (!path || segment[0] === "?" || segment[0] === "#") {
            path += segment;
        }
        else if (isVolume(segment)) {
            if (path) {
                path += segment + "/";
            }
            else {
                path = segment;
            }
        }
        else {
            path += (path.endsWith(_sep) ? "" : _sep) + trim(segment, "/\\");
        }
    }
    if (/^file:\/\/\/[a-z]:$/i.test(path)) {
        return path + "/";
    }
    else {
        return path;
    }
}
/**
 * This function is similar to Node.js implementation, but does not preserve
 * trailing slashes.
 *
 * Since Node.js implementation is not well-designed and this function is
 * identical as calling `join(path)`, so it is deprecated.
 * @experimental
 *
 * @deprecated use {@link join} or {@link sanitize} instead.
 */
function normalize(path) {
    return join(path);
}
/**
 * Similar to {@link normalize}, but also remove the search string and hash
 * string if present.
 * @experimental
 *
 * @example
 * ```ts
 * import { sanitize } from "@ayonli/jsext/path";
 *
 * console.log(sanitize("foo/bar?query")); // "foo/bar"
 * console.log(sanitize("foo/bar#hash")); // "foo/bar"
 * console.log(sanitize("foo/bar/..?query#hash")); // "foo"
 * console.log(sanitize("foo/./bar/..?query#hash")); // "foo"
 * ```
 */
function sanitize(path) {
    return join(...split(path).filter(isNotQuery));
}
/**
 * Resolves path `segments` into a well-formed path.
 *
 * This function is similar to {@link join}, except it always returns an
 * absolute path based on current working directory if the input segments are not
 * absolute by themselves.
 * @experimental
 */
function resolve(...segments) {
    segments = segments.filter(s => s !== "");
    const _cwd = cwd();
    if (!segments.length) {
        return _cwd;
    }
    segments = isAbsolute(segments[0]) ? segments : [_cwd, ...segments];
    return join(...segments);
}
/**
 * Returns the parent path of the given `path`.
 * @experimental
 *
 * @example
 * ```ts
 * import { dirname } from "@ayonli/jsext/path";
 *
 * console.log(dirname("foo/bar")); // "foo"
 * console.log(dirname("/foo/bar")); // "/foo"
 * console.log(dirname("C:\\foo\\bar")); // "C:\\foo"
 * console.log(dirname("file:///foo/bar")); // "file:///foo"
 * console.log(dirname("http://example.com/foo/bar")); // "http://example.com/foo"
 * console.log(dirname("http://example.com/foo")); // "http://example.com"
 * console.log(dirname("http://example.com/foo/bar?foo=bar#baz")); // "http://example.com/foo"
 * ```
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
 *
 * @example
 * ```ts
 * import { basename } from "@ayonli/jsext/path";
 *
 * console.log(basename("/foo/bar")); // "bar"
 * console.log(basename("c:\\foo\\bar")); // "bar"
 * console.log(basename("file:///foo/bar")); // "bar"
 * console.log(basename("http://example.com/foo/bar")); // "bar"
 * console.log(basename("http://example.com/foo/bar?foo=bar#baz")); // "bar"
 * console.log(basename("http://example.com/foo/bar.txt?foo=bar#baz", ".txt")); // "bar"
 * ```
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
 *
 * @example
 * ```ts
 * import { extname } from "@ayonli/jsext/path";
 *
 * console.log(extname("/foo/bar.txt")); // ".txt"
 * console.log(extname("c:\\foo\\bar.txt")); // ".txt"
 * console.log(extname("file:///foo/bar.txt")); // ".txt"
 * console.log(extname("http://example.com/foo/bar.txt")); // ".txt"
 * console.log(extname("http://example.com/foo/bar.txt?foo=bar#baz")); // ".txt"
 * ```
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

export { basename, cwd, dirname, extname, isAbsolute, isPosixPath, isUrl, isWindowsPath, join, normalize, resolve, sanitize, sep, split };
//# sourceMappingURL=index.js.map
