import { includesSlice, startsWith as startsWith$1, endsWith as endsWith$1, equals as equals$1 } from '../array.js';
import { trim, trimEnd } from '../string.js';

function isNotQuery(str) {
    return str[0] !== "?" && str[0] !== "#";
}
function isVolume(path, strict = false) {
    return strict ? /^[a-zA-Z]:$/.test(path) : /^[a-zA-Z]:(\\)?$/.test(path);
}
/**
 * Checks if the given `path` is a Windows specific path.
 *
 * @example
 * ```ts
 * import { isWindowsPath } from "@ayonli/jsext/path";
 *
 * console.assert(isWindowsPath("C:\\Windows\\System32"));
 * console.assert(isWindowsPath("c:\\Windows\\System32")); // case-insensitive on volume
 * console.assert(isWindowsPath("D:/Program Files")); // forward slash is also valid
 * console.assert(isWindowsPath("E:")); // volume without path is also valid
 * ```
 */
function isWindowsPath(path) {
    return /^[a-zA-Z]:/.test(path) && path.slice(1, 4) !== "://";
}
/**
 * Checks if the given `path` is a Posix specific path.
 *
 * @example
 * ```ts
 * import { isPosixPath } from "@ayonli/jsext/path";
 *
 * console.assert(isPosixPath("/usr/bin"));
 * ```
 */
function isPosixPath(path) {
    return /^\//.test(path);
}
/**
 * Checks if the given `path` is a file system path.
 *
 * @example
 * ```ts
 * import { isFsPath } from "@ayonli/jsext/path";
 *
 * console.assert(isFsPath("/usr/bin"));
 * console.assert(isFsPath("C:\\Windows\\System32"));
 * console.assert(isFsPath("./foo/bar"));
 * console.assert(isFsPath("../foo/bar"));
 * ```
 */
function isFsPath(path) {
    return /^(\.[\/\\]|\.\.[\/\\]|[a-zA-Z]:|\/)/.test(path);
}
/**
 * Checks if the given string is a URL, whether standard or non-standard.
 *
 * @example
 * ```ts
 * import { isUrl } from "@ayonli/jsext/path";
 *
 * console.assert(isUrl("http://example.com"));
 * console.assert(isUrl("https://example.com?foo=bar#baz"));
 * console.assert(isUrl("ftp://example.com")); // ftp url
 * console.assert(isUrl("file:///C:/Windows/System32")); // file url
 * console.assert(isUrl("file://localhost/C:/Windows/System32")); // file url with hostname
 * console.assert(isUrl("file:///usr/bin"));
 * ```
 */
function isUrl(str) {
    return /^[a-z](([a-z\-]+)?:\/\/\S+|[a-z\-]+:\/\/$)/i.test(str) || isFileUrl(str);
}
/**
 * Checks if the given string or {@link URL} instance is a file URL, whether
 * with or without `//`.
 *
 * @example
 * ```ts
 * import { isFileUrl } from "@ayonli/jsext/path";
 *
 * console.assert(isFileUrl("file:///C:/Windows/System32"));
 * console.assert(isFileUrl("file://localhost/C:/Windows/System32"));
 * console.assert(isFileUrl("file:///usr/bin"));
 * console.assert(isFileUrl("file:/usr/bin"));
 * console.assert(isFileUrl("file:///usr/bin?foo=bar"));
 * console.assert(isFileUrl(new URL("file:///usr/bin?foo=bar")));
 * ```
 */
function isFileUrl(path) {
    return typeof path === "string"
        ? /^file:((\/\/|\/)\S+|\/?$)/i.test(path)
        : path.protocol === "file:";
}
/**
 * Checks if the given `path` is an absolute path.
 *
 * @example
 * ```ts
 * import { isAbsolute } from "@ayonli/jsext/path";
 *
 * console.assert(isAbsolute("/usr/bin"));
 * console.assert(isAbsolute("C:\\Windows\\System32"));
 * console.assert(isAbsolute("http://example.com"));
 * console.assert(isAbsolute("file:///C:/Windows/System32"));
 * console.assert(isAbsolute("file://localhost/C:/Windows/System32?foo=bar#baz"));
 * ```
 */
function isAbsolute(path) {
    return isPosixPath(path) || isWindowsPath(path) || isUrl(path);
}
/**
 * Splits the `path` into well-formed segments.
 *
 * @example
 * ```ts
 * import { split } from "@ayonli/jsext/path";
 *
 * console.log(split("/usr/bin")); // ["/", "usr", "bin"]
 * console.log(split("C:\\Windows\\System32")); // ["C:\\", "Windows", "System32"]
 * console.log(split("file:///user/bin")); // ["file:///", "usr", "bin"]
 *
 * console.log(split("http://example.com/foo/bar?foo=bar#baz"));
 * // ["http://example.com", "foo", "bar", "?foo=bar", "#baz"]
 * ```
 */
function split(path) {
    if (!path) {
        return [];
    }
    else if (isUrl(path)) {
        const { protocol, host, pathname, search, hash } = new URL(path);
        let origin = protocol + "//" + host;
        if (protocol === "file:" && !host) {
            origin += "/";
        }
        if (pathname === "/") {
            if (search && hash) {
                return [origin, search, hash];
            }
            else if (search) {
                return [origin, search];
            }
            else if (hash) {
                return [origin, hash];
            }
            else {
                return [origin];
            }
        }
        else {
            const segments = trim(decodeURI(pathname), "/").split(/[/\\]+/);
            if (search && hash) {
                return [origin, ...segments, search, hash];
            }
            else if (search) {
                return [origin, ...segments, search];
            }
            else if (hash) {
                return [origin, ...segments, hash];
            }
            else {
                return [origin, ...segments];
            }
        }
    }
    else if (isWindowsPath(path)) {
        const [_, volume, ...segments] = split("file:///" + path.replace(/[/\\]+/g, "/"));
        return [volume + "\\", ...segments];
    }
    else if (isPosixPath(path)) {
        const [_, ...segments] = split("file://" + path.replace(/[/\\]+/g, "/"));
        return ["/", ...segments];
    }
    else { // relative path
        path = path.replace(/[/\\]+/g, "/");
        const [_path, query] = path.split("?");
        if (query) {
            const segments = _path ? trimEnd(_path, "/").split("/") : [];
            const [search, hash] = query.split("#");
            if (hash) {
                return [...segments, "?" + search, "#" + hash];
            }
            else {
                return [...segments, "?" + search];
            }
        }
        else {
            const [pathname, hash] = path.split("#");
            const segments = pathname ? trimEnd(pathname, "/").split("/") : [];
            if (hash) {
                return [...segments, "#" + hash];
            }
            else {
                return segments;
            }
        }
    }
}
function stripFileProtocol(path) {
    return path
        .replace(/^file:\/\/(localhost)?\/?([a-z]:)/i, "$2")
        .replace(/^file:\/?([a-z]:)/i, "$1")
        .replace(/^file:\/\/(localhost)?\//i, "/")
        .replace(/^file:\//i, "/");
}
function extractSegmentsForComparison(path, sub, options = {}) {
    if (options.caseInsensitive) {
        path = path.toLowerCase();
        sub = sub.toLowerCase();
    }
    if (options.ignoreFileProtocol) {
        path = stripFileProtocol(path);
        sub = stripFileProtocol(sub);
    }
    const paths = split(path).filter(isNotQuery);
    const subs = split(sub).filter(isNotQuery);
    if (paths.length < subs.length) {
        return { result: false, paths: [], subs: [] };
    }
    if (!options.caseInsensitive) {
        paths.forEach((segment, i) => {
            if (isVolume(segment)) {
                // Windows volume is always case-insensitive
                paths[i] = segment.toLowerCase();
            }
        });
        subs.forEach((segment, i) => {
            if (isVolume(segment)) {
                // Windows volume is always case-insensitive
                subs[i] = segment.toLowerCase();
            }
        });
    }
    if (!subs.length) {
        return { result: true, paths, subs };
    }
    return { result: undefined, paths, subs };
}
/**
 * Checks if the `path` contains the given `sub` path.
 *
 * This function doesn't check the path string directly, instead, it checks the
 * path segments.

 * This function is ignorant about the path separator, the query string and the
 * hash string (if present). And is case-insensitive on Windows volume symbol
 * by default.
 *
 * @example
 * ```ts
 * import { contains } from "@ayonli/jsext/path";
 *
 * console.assert(contains("/usr/bin", "/usr"));
 * console.assert(contains("C:\\Windows\\System32", "Windows\\System32"));
 * console.assert(contains("http://example.com/foo/bar", "foo"));
 * console.assert(contains("file:///C:/Windows/System32", "C:/Windows/System32"));
 *
 * // To be noted, the origin portion of a URL is considered as a whole segment.
 * console.assert(!contains("http://example.com/foo/bar", "example.com"));
 * console.assert(contains("http://example.com/foo/b", "http://example.com"));
 * ```
 */
function contains(path, sub, options = {}) {
    const { result, paths, subs } = extractSegmentsForComparison(path, sub, options);
    if (result !== undefined) {
        return result;
    }
    return includesSlice(paths, subs);
}
/**
 * Checks if the `path` starts with the given `sub` path.
 *
 * This function doesn't check the path string directly, instead, it checks the
 * path segments.
 *
 * This function is ignorant about the path separator, the query string and the
 * hash string (if present). And is case-insensitive on Windows volume symbol
 * by default.
 *
 * @example
 * ```ts
 * import { startsWith } from "@ayonli/jsext/path";
 *
 * console.assert(startsWith("/usr/bin", "/usr"));
 * console.assert(startsWith("C:\\Windows\\System32", "c:/Windows"));
 * console.assert(startsWith("http://example.com/foo/bar", "http://example.com"));
 * console.assert(startsWith("file:///C:/Windows/System32", "file:///c:/Windows"));
 *
 * // To be noted, the origin portion of a URL is considered as a whole segment.
 * console.assert(!startsWith("http://example.com/foo/bar", "example.com"));
 * console.assert(startsWith("http://example.com/foo/b", "http://example.com"));
 *
 * // ignore file protocol
 * console.assert(startsWith("file:///C:/Windows/System32", "C:/Windows/System32", {
 *     ignoreFileProtocol: true,
 * }));
 * ```
 */
function startsWith(path, sub, options = {}) {
    const { result, paths, subs } = extractSegmentsForComparison(path, sub, options);
    if (result !== undefined)
        return result;
    return startsWith$1(paths, subs);
}
/**
 * Checks if the `path` ends with the given `sub` path.
 *
 * This function doesn't check the path string directly, instead, it checks the
 * path segments.
 *
 * This function is ignorant about the path separator, the query string and the
 * hash string (if present). And is case-insensitive on Windows volume symbol
 * by default.
 *
 * @example
 * ```ts
 * import { endsWith } from "@ayonli/jsext/path";
 *
 * console.assert(endsWith("/usr/bin", "bin"));
 * console.assert(endsWith("C:\\Windows\\System32", "System32"));
 * console.assert(endsWith("http://example.com/foo/bar", "bar"));
 * console.assert(endsWith("file:///C:/Windows/System32", "System32"));
 *
 * // To be noted, an absolute sub path has its own root.
 * console.assert(!endsWith("/usr/bin", "/bin"));
 * ```
 */
function endsWith(path, sub, options = {}) {
    const { result, paths, subs } = extractSegmentsForComparison(path, sub, options);
    if (result !== undefined)
        return result;
    return endsWith$1(paths, subs);
}
/**
 * Checks if the `path1` and `path2` describe the same path.
 *
 * This function doesn't check the path string directly, instead, it checks the
 * path segments.
 *
 * This function is ignorant about the path separator, the query string and the
 * hash string (if present). And is case-insensitive on Windows volume symbol
 * by default.
 *
 * @example
 * ```ts
 * import { equals } from "@ayonli/jsext/path";
 *
 * console.assert(equals("/usr/bin", "/usr/bin"));
 * console.assert(equals("C:\\Windows\\System32", "c:/Windows/System32"));
 * console.assert(equals("http://example.com/foo/bar?foo=bar", "http://example.com/foo/bar"));
 * console.assert(equals("file://localhost/C:/Windows/System32", "file:///c:/Windows/System32"));
 *
 * // ignore file protocol
 * console.assert(equals("file:///C:/Windows/System32", "C:\\Windows\\System32", {
 *     ignoreFileProtocol: true,
 * }));
 * ```
 */
function equals(path1, path2, options = {}) {
    const { result, paths, subs } = extractSegmentsForComparison(path1, path2, options);
    if (result === false || paths.length !== subs.length)
        return false;
    return equals$1(paths, subs);
}

export { contains, endsWith, equals, isAbsolute, isFileUrl, isFsPath, isNotQuery, isPosixPath, isUrl, isVolume, isWindowsPath, split, startsWith };
//# sourceMappingURL=util.js.map
