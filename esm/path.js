import { isDeno, isNodeLike } from './env.js';
import './error.js';
import { stripEnd, trim } from './string.js';
import { isAbsolute, split, isUrl, isPosixPath, isWindowsPath, isNotQuery, isVolume, isFileUrl, isFsPath } from './path/util.js';
export { contains, endsWith, equals, startsWith } from './path/util.js';
import { NotSupportedError } from './error/common.js';

/**
 * Platform-independent utility functions for dealing with file system paths and
 * URLs.
 *
 * The functions in this module are designed to be generic and work in any
 * runtime, whether server-side or browsers. They can be used for both system
 * paths and URLs.
 * @module
 */
/**
 * Platform-specific path segment separator. The value is `\` in Windows
 * server-side environments, and `/` elsewhere.
 */
const sep = (() => {
    if (isDeno) {
        if (Deno.build.os === "windows") {
            return "\\";
        }
    }
    else if (isNodeLike) {
        if (process.platform === "win32") {
            return "\\";
        }
    }
    return "/";
})();
/**
 * Returns the current working directory.
 *
 * **NOTE:** In the browser, this function returns the current origin and pathname.
 *
 * This function may fail in unsupported environments or being rejected by the
 * permission system of the runtime.
 */
function cwd() {
    if (isDeno) {
        return Deno.cwd();
    }
    else if (isNodeLike) {
        return process.cwd();
    }
    else if (typeof location === "object" && location.origin) {
        return location.origin + (location.pathname === "/" ? "" : location.pathname);
    }
    else {
        throw new NotSupportedError("Unable to determine the current working directory.");
    }
}
/**
 * Concatenates all given `segments` into a well-formed path.
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
 *
 * @deprecated use {@link join} or {@link sanitize} instead.
 */
function normalize(path) {
    return join(path);
}
/**
 * Similar to {@link normalize}, but also remove the search string and hash
 * string if present.
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
 * absolute path based on the current working directory if the input segments
 * are not absolute by themselves.
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
        const _dirname = dirname(decodeURI(pathname));
        if (_dirname === "/") {
            return protocol === "file:" && !host ? origin + "/" : origin;
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
        return basename(decodeURI(pathname), suffix);
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
/**
 * Converts the given path to a file URL if it's not one already.
 *
 * @example
 * ```ts
 * import { toFileUrl } from "@ayonli/jsext/path";
 *
 * console.log(toFileUrl("foo/bar")); // "file:///foo/bar"
 * console.log(toFileUrl("c:\\foo\\bar")); // "file:///c:/foo/bar"
 * ```
 */
function toFileUrl(path) {
    if (isFileUrl(path)) {
        return path;
    }
    else if (!isUrl(path)) {
        let _path = resolve(path).replace(/\\/g, "/");
        _path = _path[0] === "/" ? _path : "/" + _path;
        return new URL("file://" + _path).href;
    }
    else {
        throw new NotSupportedError("Cannot convert a URL to a file URL.");
    }
}
/**
 * Converts the given URL to a file system path if it's not one already.
 *
 * @example
 * ```ts
 * import { toFsPath } from "@ayonli/jsext/path";
 *
 * console.log(toFsPath("file:///foo/bar")); // "/foo/bar"
 * console.log(toFsPath("file:///c:/foo/bar")); // "c:\\foo\\bar"
 * ```
 */
function toFsPath(url) {
    if (typeof url === "object") {
        if (url.protocol === "file:") {
            return join(fileUrlToFsPath(url.toString()));
        }
        else {
            throwNonFileUrlConversionError();
        }
    }
    if (isFsPath(url)) {
        return url;
    }
    else if (isFileUrl(url)) {
        return join(fileUrlToFsPath(url));
    }
    else if (!isUrl(url)) {
        return resolve(url);
    }
    else {
        throwNonFileUrlConversionError();
    }
}
function fileUrlToFsPath(url) {
    return url.replace(/^file:(\/\/)?/i, "").replace(/^\/([a-z]):/i, "$1:");
}
function throwNonFileUrlConversionError() {
    throw new NotSupportedError("Cannot convert a non-file URL to a file system path.");
}

export { basename, cwd, dirname, extname, isAbsolute, isFileUrl, isFsPath, isPosixPath, isUrl, isWindowsPath, join, normalize, resolve, sanitize, sep, split, toFileUrl, toFsPath };
//# sourceMappingURL=path.js.map
