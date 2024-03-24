import { trim, trimEnd } from '../string/index.js';

function isNotQuery(str) {
    return str[0] !== "?" && str[0] !== "#";
}
function isVolume(path, strict = false) {
    return strict ? /^[a-z]:$/i.test(path) : /^[a-z]:(\\)?$/i.test(path);
}
/**
 * Checks if the given `path` is a Windows specific path.
 * @experimental
 */
function isWindowsPath(path) {
    return /^[a-z]:/i.test(path) && path.slice(1, 4) !== "://";
}
/**
 * Checks if the given `path` is a Posix specific path.
 * @experimental
 */
function isPosixPath(path) {
    return /^\//.test(path);
}
/**
 * Checks if the given string is a URL, whether standard or non-standard.
 * @experimental
 */
function isUrl(str) {
    return /^[a-z](([a-z\-]+)?:\/\/\S+|[a-z\-]+:\/\/$)/i.test(str) || isFileUrl(str);
}
/**
 * Checks if the given string is a file URL, whether with or without `//`.
 * @experimental
 */
function isFileUrl(str) {
    return /^file:((\/\/|\/)\S+|\/?$)/i.test(str);
}
function isFileProtocol(path) {
    return /^file:(\/\/)?$/i.test(path);
}
/**
 * Checks if the given `path` is an absolute path.
 * @experimental
 */
function isAbsolute(path) {
    return isPosixPath(path) || isWindowsPath(path) || isUrl(path);
}
/**
 * Splits the `path` into well-formed segments.
 * @experimental
 */
function split(path) {
    if (!path) {
        return [];
    }
    else if (isUrl(path)) {
        const { protocol, host, pathname, search, hash } = new URL(path);
        const origin = protocol + "//" + host;
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
            const segments = trim(pathname, "/").split(/[/\\]+/);
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
        if (paths.length > 0 && isVolume(paths[0])) {
            // Windows volume is always case-insensitive
            paths[0] = paths[0].toLowerCase();
        }
        if (subs.length > 0 && isVolume(subs[0])) {
            // Windows volume is always case-insensitive
            subs[0] = subs[0].toLowerCase();
        }
    }
    if (!subs.length) {
        return { result: true, paths, subs };
    }
    return { result: undefined, paths, subs };
}
/**
 * Checks if the `path` contains the given `sub` path.
 *
 * This function is ignorant about the path separator, the query string and the
 * hash string (if present). And is case-insensitive on Windows volume symbol
 * by default.
 * @experimental
 */
function contains(path, sub, options = {}) {
    const { result, paths, subs } = extractSegmentsForComparison(path, sub, options);
    if (result !== undefined) {
        return result;
    }
    const head = subs[0];
    for (let i = 0; i < paths.length; i++) {
        if (paths[i] !== head)
            continue;
        const pin = i;
        let matched = 1;
        let j = i;
        while (matched < subs.length) {
            j++;
            if (paths[j] !== subs[j - pin]) {
                break;
            }
            matched++;
        }
        if (matched === subs.length) {
            return true;
        }
    }
    return false;
}
/**
 * Checks if the `path` starts with the given `sub` path.
 *
 * This function is ignorant about the path separator, the query string and the
 * hash string (if present). And is case-insensitive on Windows volume symbol
 * by default.
 * @experimental
 */
function startsWith(path, sub, options = {}) {
    const { result, paths, subs } = extractSegmentsForComparison(path, sub, options);
    if (result !== undefined)
        return result;
    for (let i = 0; i < subs.length; i++) {
        if (subs[i] !== paths[i]) {
            return false;
        }
    }
    return true;
}
/**
 * Checks if the `path` ends with the given `sub` path.
 *
 * This function is ignorant about the path separator, the query string and the
 * hash string (if present). And is case-insensitive on Windows volume symbol
 * by default.
 * @experimental
 */
function endsWith(path, sub, options = {}) {
    const { result, paths, subs } = extractSegmentsForComparison(path, sub, options);
    if (result !== undefined)
        return result;
    for (let i = subs.length - 1, j = paths.length - 1; i >= 0; i--, j--) {
        if (subs[i] !== paths[j]) {
            return false;
        }
    }
    return true;
}
/**
 * Checks if the `path1` and `path2` describe the same path.
 *
 * This function is ignorant about the path separator, the query string and the
 * hash string (if present). And is case-insensitive on Windows volume symbol
 * by default.
 * @experimental
 */
function equals(path1, path2, options = {}) {
    const { result, paths, subs } = extractSegmentsForComparison(path1, path2, options);
    if (result === false || paths.length !== subs.length) {
        return false;
    }
    for (let i = 0; i < paths.length; i++) {
        if (paths[i] !== subs[i]) {
            return false;
        }
    }
    return true;
}

export { contains, endsWith, equals, isAbsolute, isFileProtocol, isFileUrl, isNotQuery, isPosixPath, isUrl, isVolume, isWindowsPath, split, startsWith };
//# sourceMappingURL=util.js.map
